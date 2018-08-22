import { Reflector, PropertyMirror, InterfaceMirror, ClassMirror, TypeMirror, TypeAliasMirror } from "./Reflector";

// TODO: Replace all the `any`s with `unknown`s

/**
 * Constructs a concrete Reflector impl based on the output from `TypeDoc --json` 
 * 
 * @param jsonObj 
 */
export function typedocReflector(jsonObj: any): Reflector {
    const reflector = new TypedocJSONReflector();
    reflector.readJSON(jsonObj);
    return reflector;
}

/**
 * Known (interesting) KindStrings. 
 * 
 * The TypeScript kinds are a non-explicit enum, so the integer values may drift across TSC versions, we're stuck with 
 * using the strings for now.
 * 
 * TODO: Figure out where TypeDoc gets these from, and use them. 
 */
enum KindString {
    Class = 'Class',
    Constructor = 'Constructor',
    Enumeration = 'Enumeration',
    EnumerationMember = 'Enumeration member',
    ExternalModule = 'External module', // TS or JS file
    Function = 'Function',
    Interface = 'Interface',
    Method = 'Method',
    Module = 'Module', // TS namespace module
    ObjectLiteral = 'Object literal',
    Property = 'Property',
    TypeAlias = 'Type alias',
    Variable = 'Variable',
    Builtin = 'Builtin', // TODO: I made this up, either remove `readonly kindString` from the TypeMirror API or move this enum into it
}

/**
 * The subset of module-level kinds we're looking at for individual entries in the documentation
 */
const typeKinds = [
    KindString.Class,
    KindString.Interface,
    KindString.TypeAlias,
    KindString.Enumeration,
    KindString.ExternalModule
];

interface NameAndId {
    name: string;
    id: number;
}

class TypedocJSONReflector implements Reflector {

    protected stringBuiltin: Primitive;

    protected shapes: { [k: string]: number } = {};
    protected keys: { [k: string]: number } = {};
    protected modules: Array<NameAndId> = [];
    protected kinds: Array<string> = [];

    /** Interesting types' definitions */
    protected typeDefById: Map<number, any> = new Map();

    protected total = 0;

    constructor() {
        this.stringBuiltin = new Primitive(this, 'string', -100);
    }

    readJSON(obj: any) {
        this.explore(obj);
    }

    protected explore(obj: any) {

        this.total++;

        // Index any interesting typedefs
        if (obj.id && obj.name && obj.kindString && typeKinds.indexOf(obj.kindString) >= 0) {
            this.typeDefById.set(obj.id, obj);
        }

        if (obj.kindString === KindString.ExternalModule) {
            // External Module names are wrapped in quotes for some reason
            const name = obj.name.replace(/^"(.*?)"$/, '$1');
            const id: number = obj.id;

            this.modules.push({ name, id });
        }

        // Kinds
        if (obj.kind) {
            let kind = `${obj.kind} : ${obj.kindString || 'unknown'}`;
            if (this.kinds.indexOf(kind) === -1) {
                this.kinds.push(kind);
            }
        }

        // Build shapes index
        let keys = Object.keys(obj);
        keys.sort();
        let shape = keys.join(', ');

        let count = this.shapes[shape] || 0;
        count++;
        this.shapes[shape] = count;

        for (const key of keys) {
            count = this.keys[key] || 0;
            count++;
            this.keys[key] = count;
        }

        // Recurse

        if (obj.children && Array.isArray(obj.children)) {
            for (const child of obj.children) {
                this.explore(child);
            }
        }
    }

    findClassesByName(className: string): Array<number> {
        let results: Array<number> = [];

        for (const [key, value] of this.typeDefById) {
            if (value.kindString === KindString.Class && value.name === className) {
                results.push(key);
            }
        }

        return results;
    }

    describeTypeById(id: number): TypeMirror {
        const td = this.typeDefById.get(id);

        if (td) {
            return this.describeTypeForDefinition(td);
        }

        // TODO: return builtins based on their IDs

        throw new Error(`describeTypeById: type ${id} not found`);
    }

    /**
     * Given a definition (not a reference / intrinsic), will return a TypeMirror 
     * 
     * @param typeDef the JSON type def
     */
    describeTypeForDefinition(typeDef: any): TypeMirror {

        if (typeDef.kindString === KindString.Class) {
            return new TypedocJSONClassMirror(this, typeDef);
        }

        if (typeDef.kindString === KindString.Interface) {
            return new TypedocJSONInterfaceMirror(this, typeDef);
        }

        if (typeDef.kindString === KindString.TypeAlias) {
            return new TypedocJSONAliasMirror(this, typeDef);
        }

        throw new Error(`describeTypeForDefinition: no mirror for kind "${typeDef.kindString}"`);
    }

    get moduleNames(): Array<string> {
        return this.modules.map(nameAndId => nameAndId.name);
    }

    isInterface(mirror: TypeMirror): mirror is InterfaceMirror {
        return mirror instanceof TypedocJSONInterfaceMirrorBase;
    }

    isClass(mirror: TypeMirror): mirror is ClassMirror {
        return mirror instanceof TypedocJSONClassMirror;
    }

    describeBuiltin(name: string): TypeMirror {

        // TODO: Clean this up to iterate a list of known builtins
        if (name === 'string') {
            return this.stringBuiltin;
        }

        throw new Error(`describeBuiltin() - do not know about builtin named "${name}"`);
    }

    debug(): string {
        let result = '';

        result += 'Interesting Types:\n';
        for (const td of this.typeDefById.values()) {
            result += `  * ${td.name} : ${td.kindString} id:${td.id}\n`;
        }
        result += '\n';

        result += `${this.total} total defs.\n`;

        return result;
    }
}

/** Base for anything using the common definition fields */
class JSONDefinitionBase {

    protected definition: any;
    protected reflector: Reflector;

    id: number;
    kindString: string;
    name: string;

    constructor(reflector: Reflector, definition: any) {
        this.definition = definition;
        this.reflector = reflector;

        this.id = definition.id;
        this.kindString = definition.kindString;
        this.name = definition.name;

        // TODO: Assert all these fields exist
    }

    getReflector(): Reflector {
        return this.reflector;
    }
}

/**
 * Base for implementing docstring - used by prop defs and typedefs 
 */
class JSONDefinitionDocCommentsBase extends JSONDefinitionBase {

    hasComment: boolean;
    commentShortText: string;
    commentLongText: string;

    constructor(reflector: Reflector, definition: any) {
        super(reflector, definition);

        const comment = definition.comment;

        this.hasComment = !!comment;
        this.commentShortText = comment && comment.shortText || '';
        this.commentLongText = comment && comment.text || '';
    }
}

/** 
 * Base for TypeMirror based on common json def 
 */
abstract class JSONDefinitionTypeBase extends JSONDefinitionDocCommentsBase implements TypeMirror {
    abstract readonly isBuiltin: boolean;
    abstract readonly isPrimitive: boolean;
    abstract readonly isComplex: boolean;
}

/**
 * Base for class and interface impls
 */
abstract class TypedocJSONInterfaceMirrorBase extends JSONDefinitionTypeBase implements InterfaceMirror {

    readonly isComplex = true;
    readonly isPrimitive = false;

    propertyNames: Array<string>;

    constructor(reflector: Reflector, definition: any) {
        super(reflector, definition);

        this.propertyNames = (definition.children || [])
            .filter((child: any) => child.kindString === KindString.Property)
            .map((child: any) => child.name);
    }

    describeProperty(propName: string): PropertyMirror {
        let propDesc;

        for (const child of this.definition.children) {
            if (child.name === propName && child.kindString === KindString.Property) {
                propDesc = child;
                break;
            }
        }

        if (!propDesc) {
            throw new Error(`describeProperty: could not find a property name '${propName}'`);
        }

        return new TypedocJSONPropertyMirror(this, propDesc);
    }
}

class TypedocJSONInterfaceMirror extends TypedocJSONInterfaceMirrorBase implements InterfaceMirror {
    readonly isBuiltin = false;
}

class TypedocJSONClassMirror extends TypedocJSONInterfaceMirrorBase implements ClassMirror {
    get isBuiltin() {
        // TODO: Separate this for builtins that are also classes, like Date?
        return false;
    }
}

class TypedocJSONPropertyMirror extends JSONDefinitionDocCommentsBase implements PropertyMirror {

    parent: ClassMirror;

    constructor(parent: InterfaceMirror, definition: any) {
        super(parent.getReflector(), definition);
        this.parent = parent;
    }

    get typeMirror(): TypeMirror {
        const typeDecl = this.definition.type;
        const reflector = this.parent.getReflector() ;

        if (typeDecl && typeDecl.type === 'reference' && typeof typeDecl.id === 'number') {
            return reflector.describeTypeById(typeDecl.id);
        }

        if (typeDecl.type === 'intrinsic') {
            return reflector.describeBuiltin(typeDecl.name);
        }

        throw new Error(`get typeMirror(): do not understand type or reference ${JSON.stringify(typeDecl)}`);
    }
}

/**
 * Type Mirror IMPL for primitive builtins, for which we don't have defs
 */
class Primitive implements TypeMirror {

    name: string;
    id: number;

    private reflector: TypedocJSONReflector;

    constructor(reflector: TypedocJSONReflector, name: string, id: number) {
        this.reflector = reflector;
        this.name = name;
        this.id = id;
    }

    get isComplex() { return false };
    get isBuiltin() { return true };
    get isPrimitive() { return true };

    getReflector(): Reflector {
        return this.reflector;
    }

    get kindString() { return KindString.Builtin; }
    get hasComment() { return false; }
    get commentShortText() { return ''; }
    get commentLongText() { return ''; }
}

class TypedocJSONAliasMirror extends JSONDefinitionTypeBase implements TypeAliasMirror {
    
    readonly isBuiltin = false;
    readonly isPrimitive = false;
    readonly isComplex = false;

    constructor(reflector: Reflector, definition: any) {
        super(reflector, definition);
    }

    get targetDefinition(): TypeMirror {
        throw new Error("TODO: Impl!");
    }
}
