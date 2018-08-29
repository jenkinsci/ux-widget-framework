import { Reflector, PropertyMirror, InterfaceMirror, ClassMirror, TypeMirror, TypeAliasMirror, InterfaceLike, InterfaceLiteralMirror, UnionMirror, CallableMirror, CallableSignature, Parameter, ExternalTypeReference, EnumMirror, EnumMember } from "./Reflector";
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

    export interface CanHazComment {
        comment?: CommentDecl;
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

    export interface InterfaceDecl extends InterfaceLikeDecl, CanHazComment {
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

    // export type CallableSignatureDecl = unknown;

    // export interface FunctionInterfaceLiteralDecl extends BaseDecl {
    //     signatures: Array<CallableSignatureDecl>;
    // }

    export interface Parameter extends BaseDecl {
        type: TypeDetails;
    }

    export interface Signature extends BaseDecl {
        parameters?: Array<Parameter>;
        type: TypeDetails; // return type
    }

    export interface SignaturesLiteralDecl extends BaseDecl {
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

    export interface ExternalTypeReference {
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
            // TODO: filter by kindString     && obj.kindString === KindString.Property
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
}

class UnImplementedTypeMirror implements TypeMirror {
    // TODO: Remove this, it's just to help flesh things out and develop the tests
    isComplex: boolean = false;
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;

    constructor(message: string) {
        this.name = `UnImplementedTypeMirror for ${message}`;
    }

    id: number = 0;
    name: string;
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

    describeTypeForTypeDetails(typeDetails: InputJSON.TypeDetails): TypeMirror {

        // TODO: Break InputJSON.InterFaceDecl into separate types for class and interface, check kindstring in isFoo()
        if (InputJSON.isInterfaceDecl(typeDetails) && typeDetails.kindString === KindString.Class) {
            return new TypedocClassMirror(this, typeDetails);
        }

        if (InputJSON.isInterfaceDecl(typeDetails) && typeDetails.kindString === KindString.Interface) {
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
            return new TypedocExternalTypeReference(typeDetails);
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

    isInterface(mirror: TypeMirror): mirror is InterfaceMirror {
        return mirror instanceof TypedocInterfaceMirror || mirror instanceof TypedocClassMirror;
    }

    isClass(mirror: TypeMirror): mirror is ClassMirror {
        return mirror instanceof TypedocClassMirror;
    }

    isTypeAlias(mirror: TypeMirror): mirror is TypeAliasMirror {
        return mirror instanceof TypedocAliasMirror;
    }

    isInterfaceLiteral(mirror: TypeMirror): mirror is InterfaceLiteralMirror {
        return mirror instanceof TypedocInterfaceLiteralMirror;
    }

    isUnion(mirror: TypeMirror): mirror is UnionMirror {
        return mirror instanceof TypedocUnionMirror;
    }

    isCallable(mirror: TypeMirror): mirror is CallableMirror {
        return mirror instanceof TypedocCallableMirror;
    }

    isEnum(mirror: TypeMirror): mirror is EnumMirror {
        return mirror instanceof TypedocEnumMirror;
    }

    isExternalTypeReference(mirror: TypeMirror): mirror is ExternalTypeReference {
        return mirror instanceof TypedocExternalTypeReference;
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
}

/**
 * Base for class and interface impls
 */
abstract class TypedocInterfaceMirrorBase extends JSONDefinitionTypeBase implements InterfaceLike {

    readonly definition!: InputJSON.InterfaceDecl; // TODO: Use a "complex" base for Interface / Class / TypeLiteral?
    readonly isComplex = true;
    readonly isPrimitive = false;

    propertyNames: Array<string> = [];

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.InterfaceDecl) {
        super(reflector, definition);

        if (definition.children) {
            this.propertyNames = definition.children
                .filter(child => InputJSON.isPropertyDecl(child))
                .map(child => child.name);
        }
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

        return new TypedocJSONPropertyMirror(this.reflector, this, propDesc);
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

const propertyKindStrings = [
    KindString.Property as string,
    KindString.Variable as string
]

class TypedocJSONPropertyMirror extends JSONDefinitionDocCommentsBase implements PropertyMirror {

    definition!: InputJSON.PropertyDecl;
    parent: InterfaceLike;

    constructor(reflector: TypedocJSONReflector, parent: InterfaceLike, definition: InputJSON.PropertyDecl) {

        if (propertyKindStrings.indexOf(definition.kindString) === -1) {
            throw new Error(`TypedocJSONPropertyMirror does not know about kind "${definition.kindString}"`);
        }

        super(reflector, definition);
        this.parent = parent;
    }

    get type(): TypeMirror {
        const typeDetails = this.definition.type;
        const reflector = this.reflector as TypedocJSONReflector;
        return reflector.describeTypeForTypeDetails(typeDetails);
    }
}

/**
 * Type Mirror IMPL for primitive builtins, for which we don't have defs
 */
class Primitive implements TypeMirror {

    isComplex: boolean = false;
    isBuiltin: boolean = true;
    isPrimitive: boolean = true;

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

    protected reflector: TypedocJSONReflector;

    constructor(reflector: TypedocJSONReflector, types: Array<TypeMirror>) {
        this.reflector = reflector;
        this.types = types;
    }
}

class TypedocCallableMirror implements CallableMirror {
    isComplex: boolean = false;
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;

    name?: string;

    signatures: Array<CallableSignature>;

    protected reflector: TypedocJSONReflector;
    protected definition: InputJSON.SignaturesLiteralDecl;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.SignaturesLiteralDecl) {
        this.reflector = reflector;
        this.definition = definition;
        this.signatures = definition.signatures.map(sig => new TypedocCallableSignature(reflector, sig));
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
    name: string;
    isComplex: boolean = false; // We can't really know for sure, unfortunately
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;
    
    constructor(definition: InputJSON.ExternalTypeReference) {
        this.name = definition.name;
        // TODO: capture type params
    }
}

class TypedocEnumMirror extends JSONDefinitionDocCommentsBase implements EnumMirror {

    children: Array<EnumMember>;

    isComplex: boolean = true;
    isBuiltin: boolean = false;
    isPrimitive: boolean = false;

    protected definition!: InputJSON.EnumDecl;

    constructor(reflector: TypedocJSONReflector, definition: InputJSON.EnumDecl) {
        super(reflector, definition);

        this.children = definition.children.map(memberDecl => this.createChild(memberDecl));
    }

    protected createChild(memberDecl: InputJSON.EnumMemberDecl): EnumMember {
        const {name, defaultValue} = memberDecl;
        return {name, defaultValue};
    }
}