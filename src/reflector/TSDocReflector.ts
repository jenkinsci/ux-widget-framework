import { Reflector, PropertyMirror, InterfaceMirror, ClassMirror, TypeMirror, TypeAliasMirror } from "./Reflector";
import { isArray } from "util";

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
 * The original TypeScript kinds are a non-explicit enum, so the integer values may drift across TSC versions, we're stuck with 
 * using the strings for now.
 * 
 * TODO: Figure out where TypeDoc gets these from, and use them. 
 */
enum KindString {
    Accessor = 'Accessor',
    CallSignature = 'Call signature',
    Class = 'Class',
    Constructor = 'Constructor',
    ConstructorSignature = 'Constructor signature',
    Enumeration = 'Enumeration',
    EnumerationMember = 'Enumeration member',
    ExternalModule = 'External module', // TS or JS file
    Function = 'Function',
    GetSignature = 'Get signature',
    IndexSignature = 'Index signature',
    Interface = 'Interface',
    Method = 'Method',
    Module = 'Module', // TS namespace module
    ObjectLiteral = 'Object literal',
    Parameter = 'Parameter',
    Property = 'Property',
    TypeAlias = 'Type alias',
    TypeLiteral = 'Type literal',
    TypeParameter = 'Type parameter',
    Variable = 'Variable',

    Builtin = 'Builtin', // TODO: I made this up, either remove `readonly kindString` from the TypeMirror API or move this enum into it
}

/**
 * The subset of module-level kinds we're looking at for individual entries in the documentation
 */
const typeDefKinds = [
    KindString.Class,
    KindString.Interface,
    KindString.TypeAlias,
    KindString.Enumeration,
    KindString.ExternalModule
];

/**
 * Strong types for the input format (ie the JSON output of TypeDoc)
 */
namespace InputJSON {

    export interface BaseDecl {
        readonly id: number;
        readonly name: string;
        readonly kind: number;
        readonly kindString: string;
        // TODO: readonly flags: Flags;
    }

    export function isBaseDecl(obj: any): obj is BaseDecl {
        return (typeof obj === 'object'
            && typeof obj.id === 'number'
            && typeof obj.name === 'string'
            && typeof obj.kind === 'number'
            && typeof obj.kindString === 'string'
            //TODO: && isFlags(obj.flags)
        );
    }

    export interface CommentDecl {
        shortText: string;
        text?: string;
    };

    export function isCommentDecl(obj: any): obj is CommentDecl {
        return (typeof obj === 'object'
            && typeof obj.shortText === 'string'
            && (!('text' in obj) || typeof obj.text === 'string')
        );
    }

    export type InterfaceChild = unknown | PropertyDecl;

    export interface InterfaceDecl extends BaseDecl {
        readonly children?: Array<InterfaceChild>;
        readonly comment?: CommentDecl;
        // TODO: readonly groups: GroupsDecl;
        // TODO: readonly sources: SourcesDecl;
        // TODO: readonly extendedTypes?: ExtendedTypesDecl;
        // TODO: readonly typeParameter?: TypeParamDecl;
        // TODO: readonly extendedBy?: ExtendedByDecl;
        // TODO: readonly implementedBy?: ImplementedByDecl;

    }

    export function isInterfaceDecl(obj: any): obj is InterfaceDecl {
        return (typeof obj === 'object'
            && (Array.isArray(obj.children) || !('children' in obj))
            && (!('comment' in obj) || isCommentDecl(obj.comment))
            && isBaseDecl(obj)
        );
    }

    export type ConcreteDefinition = unknown | InterfaceDecl;

    export interface TypeAliasDecl extends BaseDecl {
        type: TypeDetails;
    }

    export function isTypeAliasDecl(obj:any): obj is TypeAliasDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeAlias
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
        );
    }

    export interface TypeLiteralDecl extends BaseDecl {
        signatures?: Array<unknown>;
        children?: Array<unknown>;
        indexSignature?: unknown;
    }

    export function isTypeLiteralDecl(obj:any):obj is TypeLiteralDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeLiteral
            && (isArray(obj.signatures) || isArray(obj.children) || isArray(obj.indexSignature))
            && isBaseDecl(obj)
        );
    }

    export type TypeDetails = unknown | IntrinsicRef | TypeReference | UnionDecl | ReflectionDecl;

    export interface TypeReference {
        type: 'reference';
        id: number;
    }

    export function isTypeReference(obj: any): obj is TypeReference {
        return (typeof obj === 'object'
            && obj.type === 'reference'
            && typeof obj.id === 'number'
        );
    }

    export interface IntrinsicRef {
        type: 'intrinsic';
        name: string;
    }

    export function isIntrinsicRef(obj: any): obj is IntrinsicRef {
        return (typeof obj === 'object'
            && obj.type === 'intrinsic'
            && typeof obj.name === 'string'
        );
    }

    export interface UnionDecl {
        type: 'union';
        types: Array<TypeDetails>;
    }

    export function isUnionDecl(obj: any): obj is UnionDecl {
        return (typeof obj === 'object'
            && obj.type === 'union'
            && Array.isArray(obj.types)
        );
    }

    export interface ReflectionDecl {
        type: 'reflection';
        declaration: InterfaceDecl;
    }

    export function isReflectionDecl(obj: any): obj is ReflectionDecl {
        return (typeof obj === 'object'
            && obj.type === 'reflection'
            && isInterfaceDecl(obj.declaration)
        );
    }

    export interface PropertyDecl extends BaseDecl {
        readonly type: TypeDetails;
        // TODO: readonly sources: SourcesDecl;
        // TODO: readonly inheritedFrom?: InheritedFromDecl;
        // TODO: readonly defaultValue?: DefaultValueDecl;
        // TODO: readonly overwrites?: OverwritesDecl;
        // TODO: readonly implementationOf?: ImplementationOfDecl;
    }

    export function isPropertyDecl(obj: any): obj is PropertyDecl {
        return (typeof obj === 'object'
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
            && obj.kindString === KindString.Property
        );
    }


}

class UnImplementedTypeMirror implements TypeMirror {
    // TODO: Remove this, it's just to help flesh things out and develop the tests
    isComplex:boolean  = false;   
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;

    getReflector(): Reflector {
        throw new Error("Method not implemented.");
    }

    id: number = 0;
    name: string = 'UnImplementedTypeMirror';
    kindString: string = 'UnImplementedTypeMirror';
    hasComment: boolean = false;
    commentShortText: string = '';
    commentLongText: string = '';
}

interface NameAndId {
    name: string;
    id: number;
}

class TypedocJSONReflector implements Reflector {

    protected builtins: Array<TypeMirror>;
    
    protected shapes: { [k: string]: number } = {};
    protected keys: { [k: string]: number } = {};
    protected modules: Array<NameAndId> = [];
    protected kinds: Array<string> = [];

    /** Interesting types' definitions */
    protected typeDefById: Map<number, any> = new Map();

    protected total = 0;

    constructor() {
        this.builtins = [
            new Primitive(this, 'any', -10),
            new Primitive(this, 'undefined', -20),
            new Primitive(this, 'void', -30),
            new Primitive(this, 'string', -1000),
            new Primitive(this, 'number', -1005),
            new Primitive(this, 'boolean', -1010),
        ];
    }

    readJSON(obj: any) {
        this.explore(obj);
    }

    protected explore(obj: any) {

        this.total++;

        // Index any interesting typedefs
        if (obj.id && obj.name && obj.kindString && typeDefKinds.indexOf(obj.kindString) >= 0) {
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
    describeTypeForDefinition(typeDef: InputJSON.ConcreteDefinition): TypeMirror {
        
        // TODO: Break InputJSON.InterFaceDecl into separate types for class and interface, check kindstring in isFoo()
        if (InputJSON.isInterfaceDecl(typeDef) && typeDef.kindString === KindString.Class) {
            return new TypedocJSONClassMirror(this, typeDef);
        }

        if (InputJSON.isInterfaceDecl(typeDef) && typeDef.kindString === KindString.Interface) {
            return new TypedocJSONInterfaceMirror(this, typeDef);
        }

        if (InputJSON.isTypeAliasDecl(typeDef)) {
            return new TypedocJSONAliasMirror(this, typeDef);
        }

        if (InputJSON.isTypeLiteralDecl(typeDef)) {
            // TODO: Impl!
            return new UnImplementedTypeMirror();
        }

        throw new Error(`describeTypeForDefinition: no mirror for definition:\n"${JSON.stringify(typeDef, null, 4)}"`);
    }

    describeTypeForTypeDetails(typeDetails: InputJSON.TypeDetails): TypeMirror {

        if (InputJSON.isTypeReference(typeDetails)) {
            return this.describeTypeById(typeDetails.id);
        }

        if (InputJSON.isIntrinsicRef(typeDetails)) {
            return this.describeBuiltin(typeDetails.name);
        }

        if (InputJSON.isUnionDecl(typeDetails)) {
            return this.describeTypeForUnionDecl(typeDetails);
        }

        if (InputJSON.isReflectionDecl(typeDetails)) {
            return this.describeTypeForDefinition(typeDetails.declaration);
        }

        throw new Error(`describeTypeForTypeDetails(): do not understand typeDetails:\n${JSON.stringify(typeDetails, null, 4)}`);
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
        for (const mirror of this.builtins) {
            if (mirror.name === name) {
                return mirror;
            }
        }

        throw new Error(`describeBuiltin() - do not know about builtin named "${name}"`);
    }

    describeTypeForUnionDecl(decl: InputJSON.UnionDecl): TypeMirror {
        const types: Array<TypeMirror> = decl.types.map(branchDetails => this.describeTypeForTypeDetails(branchDetails));

        // TODO: if any type is undefined, return an optional single type if only one other branch, or an optional union without undefined

        // TODO: Impl!
        return new UnImplementedTypeMirror();
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

    protected definition: InputJSON.BaseDecl;
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

    readonly definition!: InputJSON.InterfaceDecl; // TODO: Use a "complex" base for Interface / Class / TypeLiteral?
    readonly isComplex = true;
    readonly isPrimitive = false;

    propertyNames: Array<string>;

    constructor(reflector: Reflector, definition: InputJSON.InterfaceDecl) {
        super(reflector, definition);

        this.propertyNames = (definition.children || [])
            .filter((child: any) => child.kindString === KindString.Property)
            .map((child: any) => child.name);
    }

    describeProperty(propName: string): PropertyMirror {
        let propDesc;

        if (this.definition.children) {
            for (const child of this.definition.children) {
                if (InputJSON.isPropertyDecl(child) && child.name === propName) {
                    propDesc = child;
                    break;
                }
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

    definition!: InputJSON.PropertyDecl;
    parent: ClassMirror;

    constructor(parent: InterfaceMirror, definition: any) {
        super(parent.getReflector(), definition);
        this.parent = parent;
    }

    get typeMirror(): TypeMirror {
        const typeDetails = this.definition.type;
        const reflector = this.parent.getReflector() as TypedocJSONReflector;
        return reflector.describeTypeForTypeDetails(typeDetails);
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

    readonly definition!: InputJSON.TypeAliasDecl;
    readonly isBuiltin = false;
    readonly isPrimitive = false;
    readonly isComplex = false;

    constructor(reflector: Reflector, definition: InputJSON.TypeAliasDecl) {
        super(reflector, definition);
    }

    get targetDefinition(): TypeMirror {
        throw new Error("TODO: Impl TypedocJSONAliasMirror!");
    }
}
