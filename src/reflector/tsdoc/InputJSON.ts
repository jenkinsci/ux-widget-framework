import { KindString, propertyKindStrings } from "./common";

/**
 * Strong types for the input format (ie the JSON output of TypeDoc)
 */
export namespace InputJSON {

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
            && (Array.isArray(obj.children) || !('children' in obj))
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
            && (Array.isArray(obj.parameters) || !('parameters' in obj))
            && typeof obj.type === 'object'
            && isBaseDecl(obj)
        );
    }

    export function isSignaturesLiteralDecl(obj: any): obj is SignaturesLiteralDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.TypeLiteral
            && (Array.isArray(obj.signatures))
            && obj.signatures.every((sig: any) => isSignature(sig))
            && !('children' in obj)
            && !('indexSignature' in obj)
            && isBaseDecl(obj)
        );
    }

    export interface FunctionDecl extends SignaturesLiteralDecl { }

    export function isFunctionDecl(obj: any): obj is FunctionDecl {
        return (typeof obj === 'object'
            && obj.kindString === KindString.Function
            && (Array.isArray(obj.signatures))
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
            && Array.isArray(obj.children)
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