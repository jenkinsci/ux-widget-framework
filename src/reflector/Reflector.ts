
/**
 * Base reflector interface, represents a "typespace". 
 * 
 * We separate these out from the TypeDoc-specific impls so that we can eventually build the same model talking directly to TSC and bypass it.
 */
export interface Reflector {

    /**
     * Find classes by name across all modules
     */
    findClassesByName(className: string): Array<ClassMirror>;

    /** Describe a built-in type */
    describeBuiltin(name: string): TypeMirror; // TODO: Replace this with separate methods instead of stringly-typed name lookup in public interface

    /** List of the external modules */
    readonly moduleNames: Array<string>;

    readonly builtinAny: TypeMirror;
    readonly builtinUndefined: TypeMirror;
    readonly builtinVoid: TypeMirror;
    readonly builtinString: TypeMirror;
    readonly builtinNumber: TypeMirror;
    readonly builtinBoolean: TypeMirror;

    isCallable(mirror: TypeMirror): mirror is CallableMirror;
    isClass(mirror: TypeMirror): mirror is ClassMirror;
    isEnum(mirror: TypeMirror): mirror is EnumMirror;
    isExternalTypeReference(mirror: TypeMirror): mirror is ExternalTypeReference;
    isInterface(mirror: TypeMirror): mirror is InterfaceMirror;
    isInterfaceLiteral(mirror: TypeMirror): mirror is InterfaceLiteralMirror;
    isTypeAlias(mirror: TypeMirror): mirror is TypeAliasMirror;
    isUnion(mirror: TypeMirror): mirror is UnionMirror;
    

    debug(): string;
};

/** 
 * Represents any declaration that can have doc comments. Not just types themselves, but also properties within a class / interface
 */
interface SupportsDocComments {

    /** Has doc comments? */
    readonly hasComment: boolean;

    /** Doc comment heading */
    readonly commentShortText: string;

    /** Doc comment details */
    readonly commentLongText: string;

    // TODO: Tags
}

/**
 * Represents a typedef, might be a Class or Interface, Enum, or just a type alias
 */
export interface TypeMirror {
    /** Complex types would include classes, interfaces, enums, unions */
    readonly isComplex: boolean;

    /**
     * Is builtin. Could be vm objects (number, string, Date, etc) or things that exist only in the type system like Unions
     */
    readonly isBuiltin: boolean;

    /**
     * Is primitive ( Boolean, Null, Undefined, Number, String, Symbol )
     */
    readonly isPrimitive: boolean;

    /**
     * Name of this type, if it has one.
     */
    readonly name?: string; 

    /**
     * A list of any type arguments used in this declaration
     */
    // readonly typeArguments: Array<TypeMirror>;
}

/**
 * Represents a type alias
 */
export interface TypeAliasMirror extends TypeMirror, SupportsDocComments {
    /**
     * The definition (RHS) of this alias
     */
    readonly targetDefinition: TypeMirror;
}

/**
 * Represents an interface/class/literal definition, which has child properties and methods
 */
export interface InterfaceLike extends TypeMirror {
    
    /**
     * Describe a named property (everything except normal methods and constructor)
     */
    describeProperty(propName: string): PropertyMirror;

    /**
     * Lists child properties. Includes variables, object properties, getters, setters
     */
    readonly propertyNames: Array<string>;
}

/**
 * Represents a type literal used in-place of a named type
 */
export interface InterfaceLiteralMirror extends InterfaceLike { }

/**
 * Represents a TS interface decl
 */
export interface InterfaceMirror extends InterfaceLike, SupportsDocComments {
    readonly isAbstract: boolean;
}

/**
 * Represents a TS class
 */
export interface ClassMirror extends InterfaceMirror, SupportsDocComments {
    // TODO: readonly constructor: FunctionMirror
}

/**
 * Represents a property definition within an interface, class, interface literal or module
 */
export interface PropertyMirror extends SupportsDocComments {

    /**
     * Name of this property
     */
    readonly name: string;

    /**
     * Reflect the type of this property
     */
    readonly type: TypeMirror;
}

/** 
 * Represents a Union
 */
export interface UnionMirror extends TypeMirror {
    readonly types: Array<TypeMirror>;
}

/**
 * Represents a callable (function / method / constructor)
 */
export interface CallableMirror extends TypeMirror {
    /**
     * The set of possible signatures for this callable object
     */
    readonly signatures: Array<CallableSignature>;
}

/**
 * Represents a parameter to a function / method / constructor call
 */
export interface Parameter {
    /**
     * Name of parameter, if specified
     */
    readonly name?: string;

    /**
     * Type of the param
     */
    readonly type: TypeMirror;
}

/**
 * A single signature type
 */
export interface CallableSignature extends SupportsDocComments {
    readonly parameters: Array<Parameter>;
    readonly returnType: TypeMirror;
}

/**
 * Represents an Enum type
 */
export interface EnumMirror extends TypeMirror {
    children: Array<EnumMember>;
}

/** 
 * An enum member
 */
export interface EnumMember {
    readonly name: string;
    readonly defaultValue: string;
}

/**
 * Represents a named reference to a type external to the source base represented by the Reflector (such as code in node_modules)
 */
export interface ExternalTypeReference extends TypeMirror {
    readonly name: string;
    // TODO: type params
}

// TODO: Reflect modules
// TODO: Reflect module-level functions
// TODO: Reflect module-level vars