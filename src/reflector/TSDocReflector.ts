import { Reflector, PropertyMirror, InterfaceMirror, ClassMirror, TypeMirror, TypeAliasMirror, InterfaceLike, InterfaceLiteralMirror, UnionMirror, CallableMirror, CallableSignature, Parameter, ExternalTypeReference, EnumMirror, EnumMember, ModuleMirror, NamespaceMirror, NamespaceMember } from "./Reflector";
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
 * KindStrings that make up "properties"
 */
const propertyKindStrings = [
    KindString.Property,
    KindString.Variable
    // TODO: Getters / setters
]

/**
 * Strong types for the input format (ie the JSON output of TypeDoc)
 */
namespace InputJSON {

    export interface BaseDecl {
        readonly id: number;
        readonly name: string;
        readonly kind: number;
        readonly kindString: KindString;
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

    export interface CanHazComment {
        comment?: CommentDecl;
    }

    interface CanHazTypeArgs {
        typeArguments?: Array<TypeDetails>;
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

    // export type InterfaceChild = PropertyDecl; // TODO: Add method / constructor to union

    export interface InterfaceLikeDecl extends BaseDecl {
        readonly children?: Array<BaseDecl>;
    }

    interface InterfaceOrClassDecl extends InterfaceLikeDecl, CanHazComment, CanHazTypeArgs {

        // TODO: readonly extendedTypes?: ExtendedTypesDecl;
        // TODO: readonly typeParameter?: TypeParamDecl;
        // TODO: readonly extendedBy?: ExtendedByDecl;
        // TODO: readonly implementedBy?: ImplementedByDecl;

    }

    export interface InterfaceDecl extends InterfaceOrClassDecl { }

    export function isInterfaceDecl(obj: any): obj is InterfaceDecl {
        return (typeof obj === 'object'
            && (Array.isArray(obj.children) || !('children' in obj))
            && (!('comment' in obj) || isCommentDecl(obj.comment))
            && obj.kindString === KindString.Interface
            && isBaseDecl(obj)
        );
    }

    export interface ClassDecl extends InterfaceOrClassDecl { }

    export function isClassDecl(obj: any): obj is ClassDecl {
        return (typeof obj === 'object'
            && (Array.isArray(obj.children) || !('children' in obj))
            && (!('comment' in obj) || isCommentDecl(obj.comment))
            && obj.kindString === KindString.Class
            && isBaseDecl(obj)
        );
    }

    // export type ConcreteDefinition = unknown | InterfaceDecl;

    export interface TypeAliasDecl extends BaseDecl {
        type: TypeDetails;
    }

    export function isTypeAliasDecl(obj: any): obj is TypeAliasDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeAlias
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
        );
    }

    export interface InterfaceLiteralDecl extends InterfaceLikeDecl {
    }

    export function isInterfaceLiteralDecl(obj: any): obj is InterfaceLiteralDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeLiteral
            && (isArray(obj.children) || !('children' in obj))
            && !('signatures' in obj)
            && !('indexSignature' in obj)
            && isBaseDecl(obj)
        );
    }

    export interface Parameter extends BaseDecl {
        type: TypeDetails;
    }

    export interface Signature extends BaseDecl {
        parameters?: Array<Parameter>;
        type: TypeDetails; // return type
    }

    export interface SignaturesLiteralDecl extends BaseDecl, CanHazTypeArgs {
        signatures: Array<Signature>;
    }

    export function isSignature(obj: any): obj is Signature {
        return (typeof obj === 'object'
            && (obj.kindString === KindString.CallSignature || obj.kindString === KindString.ConstructorSignature)
            && (isArray(obj.parameters) || !('parameters' in obj))
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
        );
    }

    export function isSignaturesLiteralDecl(obj: any): obj is SignaturesLiteralDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeLiteral
            && (isArray(obj.signatures))
            && obj.signatures.every((sig: any) => isSignature(sig))
            && !('children' in obj)
            && !('indexSignature' in obj)
            && isBaseDecl(obj)
        );
    }

    export type TypeDetails =
        unknown
        | IntrinsicRef
        | InternalTypeReference
        | ExternalTypeReference
        | UnionDecl
        | ReflectionDecl;

    export interface InternalTypeReference {
        type: 'reference';
        id: number;
        // TODO: Type params
    }

    export interface ExternalTypeReference extends CanHazTypeArgs {
        type: 'reference';
        name: string;
        // TODO: Type params
    }

    export function isInternalTypeReference(obj: any): obj is InternalTypeReference {
        return (typeof obj === 'object'
            && obj.type === 'reference'
            && typeof obj.id === 'number'
        );
    }

    export function isExternalTypeReference(obj: any): obj is ExternalTypeReference {
        return (typeof obj === 'object'
            && obj.type === 'reference'
            && typeof obj.name === 'string'
            && !('id' in obj) // Some internal (w/id) refs also have name
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
        declaration: BaseDecl;
    }

    export function isReflectionDecl(obj: any): obj is ReflectionDecl {
        return (typeof obj === 'object'
            && obj.type === 'reflection'
            && isBaseDecl(obj.declaration)
        );
    }

    interface FlagsObj {
        isConst?: boolean,
        isExported?: boolean,
        isExternal?: boolean,
        isOptional?: boolean,
        isPrivate?: boolean,
        isStatic?: boolean,
    }

    export interface PropertyDecl extends BaseDecl {
        readonly type: TypeDetails;
        readonly flags?: FlagsObj;
        // TODO: readonly inheritedFrom?: InheritedFromDecl;
        readonly defaultValue?: string;
        // TODO: readonly overwrites?: OverwritesDecl;
        // TODO: readonly implementationOf?: ImplementationOfDecl;
    }

    export function isPropertyDecl(obj: any): obj is PropertyDecl {
        return (typeof obj === 'object'
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
            && propertyKindStrings.indexOf(obj.kindString) !== -1
        );
    }

    export interface EnumDecl extends BaseDecl {
        children: Array<EnumMemberDecl>;
    }

    export interface EnumMemberDecl extends BaseDecl {
        defaultValue: string;
    }

    export function isEnumDecl(obj: any): obj is EnumDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.Enumeration
            && isArray(obj.children)
        );
    }

    type NamespaceChild = unknown; // TODO: replace this with a union of things we expect to find inside namespaces / modules

    export interface ModuleDecl extends BaseDecl {
        originalName: string;
        children?: Array<NamespaceChild>
    }

    export function isModuleDecl(obj: any): obj is ModuleDecl {
        return (typeof obj === 'object'
            && typeof obj.originalName === 'string'
            && obj.kindString === KindString.ExternalModule
            && (!('children' in obj) || Array.isArray(obj.children))
            && isBaseDecl(obj)
        );
    }

    export interface NamespaceDecl extends BaseDecl {
        children?: Array<NamespaceChild>
    }

    export function isNamespaceDecl(obj: any): obj is NamespaceDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.Module
            && (!('children' in obj) || Array.isArray(obj.children))
            && isBaseDecl(obj)
        );
    }
}

class UnImplementedTypeMirror implements TypeMirror {
    // TODO: Remove this, it's just to help flesh things out and develop the tests
    isComplex: boolean = false;
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;
    typeArguments: Array<TypeMirror> = [];
    name: string;

    constructor(message: string) {
        this.name = `UnImplementedTypeMirror for ${message}`;
    }
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
    protected typeDefById: Map<number, InputJSON.BaseDecl> = new Map();

    protected total = 0;

    builtinAny: TypeMirror;
    builtinUndefined: TypeMirror;
    builtinVoid: TypeMirror;
    builtinString: TypeMirror;
    builtinNumber: TypeMirror;
    builtinBoolean: TypeMirror;

    constructor() {
        this.builtinAny = new Primitive('any');
        this.builtinUndefined = new Primitive('undefined');
        this.builtinVoid = new Primitive('void');
        this.builtinString = new Primitive('string');
        this.builtinNumber = new Primitive('number');
        this.builtinBoolean = new Primitive('boolean');

        this.builtins = [
            this.builtinAny,
            this.builtinUndefined,
            this.builtinVoid,
            this.builtinString,
            this.builtinNumber,
            this.builtinBoolean,
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

    findClassesByName(className: string): Array<ClassMirror> {
        let results: Array<ClassMirror> = [];

        for (const [key, value] of this.typeDefById) {
            if (value.kindString === KindString.Class && value.name === className) {
                results.push(this.describeTypeForTypeDetails(value) as ClassMirror);
            }
        }

        return results;
    }

    describeNamespaceForDecl(decl: InputJSON.NamespaceDecl): NamespaceMirror {
        return new TypedocNamespaceMirror(this, decl);
    }

    describeTypeForTypeDetails(typeDetails: InputJSON.TypeDetails): TypeMirror {

        if (InputJSON.isClassDecl(typeDetails)) {
            return new TypedocClassMirror(this, typeDetails);
        }

        if (InputJSON.isInterfaceDecl(typeDetails)) {
            return new TypedocInterfaceMirror(this, typeDetails);
        }

        if (InputJSON.isTypeAliasDecl(typeDetails)) {
            return new TypedocAliasMirror(this, typeDetails);
        }

        if (InputJSON.isEnumDecl(typeDetails)) {
            return new TypedocEnumMirror(this, typeDetails);
        }

        if (InputJSON.isInterfaceLiteralDecl(typeDetails)) {
            return new TypedocInterfaceLiteralMirror(this, typeDetails);
        }

        if (InputJSON.isSignaturesLiteralDecl(typeDetails)) {
            return new TypedocCallableMirror(this, typeDetails);
        }

        if (InputJSON.isInternalTypeReference(typeDetails)) {
            const id = typeDetails.id;
            const td = this.typeDefById.get(id);

            if (td) {
                return this.describeTypeForTypeDetails(td);
            }

            throw new Error(`describeTypeForTypeDetails - internalTypeReference: type ${id} not found`);
        }

        if (InputJSON.isExternalTypeReference(typeDetails)) {
            return new TypedocExternalTypeReference(this, typeDetails);
        }

        if (InputJSON.isIntrinsicRef(typeDetails)) {
            return this.describeBuiltin(typeDetails.name);
        }

        if (InputJSON.isUnionDecl(typeDetails)) {
            return this.describeTypeForUnionDecl(typeDetails);
        }

        if (InputJSON.isReflectionDecl(typeDetails)) {
            return this.describeTypeForTypeDetails(typeDetails.declaration);
        }

        throw new Error(`describeTypeForTypeDetails(): do not understand typeDetails:\n${JSON.stringify(typeDetails, null, 4)}`);
    }

    get moduleNames(): Array<string> {
        return this.modules.map(nameAndId => nameAndId.name);
    }

    isInterface(mirror: any): mirror is InterfaceMirror {
        return mirror instanceof TypedocInterfaceMirror || mirror instanceof TypedocClassMirror;
    }

    isClass(mirror: any): mirror is ClassMirror {
        return mirror instanceof TypedocClassMirror;
    }

    isTypeAlias(mirror: any): mirror is TypeAliasMirror {
        return mirror instanceof TypedocAliasMirror;
    }

    isInterfaceLiteral(mirror: any): mirror is InterfaceLiteralMirror {
        return mirror instanceof TypedocInterfaceLiteralMirror;
    }

    isUnion(mirror: any): mirror is UnionMirror {
        return mirror instanceof TypedocUnionMirror;
    }

    isCallable(mirror: any): mirror is CallableMirror {
        return mirror instanceof TypedocCallableMirror;
    }

    isEnum(mirror: any): mirror is EnumMirror {
        return mirror instanceof TypedocEnumMirror;
    }

    isExternalTypeReference(mirror: any): mirror is ExternalTypeReference {
        return mirror instanceof TypedocExternalTypeReference;
    }

    isModule(mirror: any): mirror is ModuleMirror {
        return mirror instanceof TypedocModuleMirror;
    }

    isNamespace(mirror: any): mirror is NamespaceMirror {
        return mirror instanceof TypedocNamespaceMirror;
    }

    isProperty(mirror: any): mirror is PropertyMirror {
        return mirror instanceof TypedocPropertyMirror;
    }

    decodeTypeArguments(typeArguments?: Array<InputJSON.TypeDetails>): Array<TypeMirror> {

        if (!typeArguments || typeArguments.length === 0) {
            return [];
        }

        return typeArguments.map(details => this.describeTypeForTypeDetails(details));
    }

    describeModule(moduleName: string): ModuleMirror {
        const foundEntry = this.modules.find(entry => entry.name === moduleName);
        if (!foundEntry) {
            throw new Error(`describeModule - could not find module named ${moduleName}`);
        }

        const definition = this.typeDefById.get(foundEntry.id);

        if (!InputJSON.isModuleDecl(definition)) {
            throw new Error(`describeModule - got bad definition:\n${JSON.stringify(definition, null, 4)}`);
        }

        return new TypedocModuleMirror(this, definition);
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
        return new TypedocUnionMirror(this, types);
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
    protected reflector: TypedocJSONReflector;

    id: number;
    kindString: string;
    name: string;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.BaseDecl) {
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

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.BaseDecl & InputJSON.CanHazComment) {
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
    abstract readonly typeArguments: Array<TypeMirror>;
}

/**
 * Base for class and interface impls
 */
abstract class TypedocInterfaceMirrorBase extends JSONDefinitionTypeBase implements InterfaceLike {

    readonly definition!: InputJSON.InterfaceDecl; // TODO: Use a "complex" base for Interface / Class / TypeLiteral?
    readonly isComplex = true;
    readonly isPrimitive = false;
    readonly typeArguments: Array<TypeMirror>;

    propertyNames: Array<string> = [];

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.InterfaceDecl) {
        super(reflector, definition);

        if (definition.children) {
            this.propertyNames = definition.children
                .filter(child => InputJSON.isPropertyDecl(child))
                .map(child => child.name);
        }

        this.typeArguments = reflector.decodeTypeArguments(definition.typeArguments);
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

        return new TypedocPropertyMirror(this.reflector, propDesc);
    }
}

class TypedocInterfaceMirror extends TypedocInterfaceMirrorBase implements InterfaceMirror {
    readonly isAbstract = true;
    readonly isBuiltin = false;
}

class TypedocInterfaceLiteralMirror extends TypedocInterfaceMirrorBase implements InterfaceLiteralMirror {
    readonly isBuiltin = false;
}

class TypedocClassMirror extends TypedocInterfaceMirrorBase implements ClassMirror {
    get isBuiltin() {
        // TODO: Separate this for builtins that are also classes, like Date?
        return false;
    }

    get isAbstract(): boolean {
        throw new Error('Implement isAbstract on TypedocJSONClassMirror');
    }
}



class TypedocPropertyMirror extends JSONDefinitionDocCommentsBase implements PropertyMirror {

    definition!: InputJSON.PropertyDecl;
    readonly readable: boolean;
    readonly writeable: boolean;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.PropertyDecl) {

        if (propertyKindStrings.indexOf(definition.kindString) === -1) {
            throw new Error(`TypedocJSONPropertyMirror does not know about kind "${definition.kindString}"`);
        }

        super(reflector, definition);

        if (definition.kindString === KindString.Property || definition.kindString === KindString.Variable) {
            this.readable = true;
            this.writeable = !(definition.flags && definition.flags.isConst);
        } else {
            throw new Error(`TODO: calculate readable and writeable for kind ${definition.kindString}`);
        }
    }

    get type(): TypeMirror {
        const typeDetails = this.definition.type;
        const reflector = this.reflector as TypedocJSONReflector;
        return reflector.describeTypeForTypeDetails(typeDetails);
    }

    get defaultValue(): string | undefined {
        if (typeof this.definition.defaultValue === 'string') {
            return this.definition.defaultValue.trim();
        }
        return undefined;
    }
}

/**
 * Type Mirror IMPL for primitive builtins, for which we don't have defs
 */
class Primitive implements TypeMirror {

    isComplex: boolean = false;
    isBuiltin: boolean = true;
    isPrimitive: boolean = true;
    readonly typeArguments: Array<TypeMirror> = [];

    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

class TypedocAliasMirror extends JSONDefinitionTypeBase implements TypeAliasMirror {

    readonly definition!: InputJSON.TypeAliasDecl;
    readonly isBuiltin = false;
    readonly isPrimitive = false;
    readonly isComplex = false;
    readonly typeArguments: Array<TypeMirror> = [];

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.TypeAliasDecl) {
        super(reflector, definition);
    }

    get targetDefinition(): TypeMirror {
        return this.reflector.describeTypeForTypeDetails(this.definition.type);
    }
}

class TypedocUnionMirror implements UnionMirror {
    isComplex: boolean = true;
    isBuiltin: boolean = true;
    isPrimitive: boolean = false;
    types: Array<TypeMirror>;
    readonly typeArguments: Array<TypeMirror> = [];

    protected reflector: TypedocJSONReflector;

    constructor(reflector: TypedocJSONReflector, types: Array<TypeMirror>) {
        this.reflector = reflector;
        this.types = types;
    }
}

class TypedocCallableMirror implements CallableMirror {
    readonly isComplex: boolean = false;
    readonly isBuiltin: boolean = false;
    readonly isPrimitive: boolean = false;
    readonly typeArguments: Array<TypeMirror>;

    readonly name?: string;

    readonly signatures: Array<CallableSignature>;

    protected reflector: TypedocJSONReflector;
    protected definition: InputJSON.SignaturesLiteralDecl;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.SignaturesLiteralDecl) {
        this.reflector = reflector;
        this.definition = definition;
        this.signatures = definition.signatures.map(sig => new TypedocCallableSignature(reflector, sig));

        this.typeArguments = reflector.decodeTypeArguments(definition.typeArguments);
    }
}

class TypedocCallableSignature extends JSONDefinitionDocCommentsBase implements CallableSignature {
    readonly parameters: Array<Parameter>;
    readonly returnType: TypeMirror;

    protected readonly definition!: InputJSON.Signature;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.Signature) {
        super(reflector, definition);

        this.returnType = reflector.describeTypeForTypeDetails(definition.type);

        const parameters: Array<Parameter> = [];

        if (definition.parameters) {
            for (const inputParam of definition.parameters) {
                parameters.push({
                    name: inputParam.name,
                    type: reflector.describeTypeForTypeDetails(inputParam.type)
                });
            }
        }

        this.parameters = parameters;

    }

}

class TypedocExternalTypeReference implements ExternalTypeReference {
    readonly name: string;
    readonly isComplex: boolean = false; // We can't really know for sure, unfortunately
    readonly isBuiltin: boolean = false;
    readonly isPrimitive: boolean = false;
    readonly typeArguments: Array<TypeMirror>;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.ExternalTypeReference) {
        this.name = definition.name;
        this.typeArguments = reflector.decodeTypeArguments(definition.typeArguments);
    }
}

class TypedocEnumMirror extends JSONDefinitionDocCommentsBase implements EnumMirror {

    readonly children: Array<EnumMember>;

    readonly isComplex: boolean = true;
    readonly isBuiltin: boolean = false;
    readonly isPrimitive: boolean = false;
    readonly typeArguments: Array<TypeMirror> = [];

    protected definition!: InputJSON.EnumDecl;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.EnumDecl) {
        super(reflector, definition);

        this.children = definition.children.map(memberDecl => this.createChild(memberDecl));
    }

    protected createChild(memberDecl: InputJSON.EnumMemberDecl): EnumMember {
        const { name, defaultValue } = memberDecl;
        return { name, defaultValue };
    }
}

// function getNamespacesFromChildren(reflector: TypedocJSONReflector, children: Array<unknown> = []): Array<NamespaceMirror> {
//     let result: Array<NamespaceMirror> = [];

//     for (const decl of children) {
//         if (InputJSON.isNamespaceDecl(decl)) {
//             result.push(reflector.describeNamespaceForDecl(decl));
//         }
//     }

//     return result;
// }

// function getPropertiesFromChildren(reflector: TypedocJSONReflector, children: Array<unknown> = []): Array<PropertyMirror> {
//     let result: Array<PropertyMirror> = [];

//     for (const decl of children) {
//         if (InputJSON.isPropertyDecl(decl)) {
//             result.push(new TypedocPropertyMirror(reflector, decl));
//         }
//     }

//     return result;
// }

function getNamespaceMembersFromChildren(reflector: TypedocJSONReflector, children: Array<unknown> = []): Array<NamespaceMember> {
    let result: Array<NamespaceMember> = [];

    // TODO: There's gotta be a way to merge this with the very similar code inside the reflector

    for (const decl of children) {
        if (InputJSON.isPropertyDecl(decl)) {
            result.push(new TypedocPropertyMirror(reflector, decl));
        }
        else if (InputJSON.isPropertyDecl(decl)) {
            result.push(new TypedocPropertyMirror(reflector, decl));
        }
        else if (InputJSON.isInterfaceDecl(decl)) {
            result.push(new TypedocInterfaceMirror(reflector, decl));
        }
        else if (InputJSON.isClassDecl(decl)) {
            result.push(new TypedocClassMirror(reflector, decl));
        }
        else if (InputJSON.isNamespaceDecl(decl)) {
            result.push(new TypedocNamespaceMirror(reflector, decl));
        }
        else if (InputJSON.isEnumDecl(decl)) {
            result.push(new TypedocEnumMirror(reflector, decl));
        }
        else if (InputJSON.isTypeAliasDecl(decl)) {
            result.push(new TypedocAliasMirror(reflector, decl));
        }
        else if (typeof (decl as any).kindString === 'string') {
            throw new Error(`getNamespaceMembersFromChildren - Unexpected namespace child with kindString ${(decl as any).kindString}`);
        }
        else {
            throw new Error(`getNamespaceMembersFromChildren - Unexpected namespace child decl ${JSON.stringify(decl, null, 4)}`);
        }
    }

    return result;
}

abstract class TypedocNamespaceBase<D extends InputJSON.ModuleDecl | InputJSON.NamespaceDecl> {

    protected reflector: TypedocJSONReflector;
    protected definition: D;

    constructor(reflector: TypedocJSONReflector, definition: D) {
        this.reflector = reflector;
        this.definition = definition;
    }

    get members(): Array<NamespaceMember> {
        // TODO: cache this
        return getNamespaceMembersFromChildren(this.reflector, this.definition.children);
    }

    get namespaces(): Array<NamespaceMirror> {
        const reflector = this.reflector;
        return this.members.filter(member => reflector.isNamespace(member)) as Array<NamespaceMirror>;
    }

    get properties(): Array<PropertyMirror> {
        return this.members.filter(member => this.reflector.isProperty(member)) as Array<PropertyMirror>;
    }

    get interfaces(): Array<InterfaceMirror> {
        return this.members.filter(member => this.reflector.isInterface(member)) as Array<InterfaceMirror>;
    }
}

class TypedocNamespaceMirror extends TypedocNamespaceBase<InputJSON.NamespaceDecl> implements NamespaceMirror {
    readonly name: string;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.NamespaceDecl) {
        super(reflector, definition);
        this.name = definition.name;
    }
}

class TypedocModuleMirror extends TypedocNamespaceBase<InputJSON.ModuleDecl> implements ModuleMirror {
    readonly name: string;
    readonly originalName: string;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.ModuleDecl) {
        super(reflector, definition);
        this.name = definition.name.replace(/^"(.*?)"$/, '$1');
        this.originalName = definition.originalName;
    }
}