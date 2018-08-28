
/**
 * Base reflector interface, represents a "typespace". 
 * 
 * We separate these out from the TypeDoc-specific impls so that we can eventually build the same model talking directly to TSC and bypass it.
 */
export interface Reflector {

    /**
     * Find classes by name across all modules
     * 
     * @param className class name
     * @return an array of matching ids
     */
    findClassesByName(className: string): Array<number>;

    /** Lookup typedef by id */
    describeTypeById(id: number): TypeMirror;

    /** Describe a built-in type */
    describeBuiltin(name: string): TypeMirror; // TODO: Replace this with separate methods instead of stringly-typed name lookup in public interface

    /** List of the external modules */
    readonly moduleNames: Array<string>;

    isInterface(mirror: TypeMirror): mirror is InterfaceMirror;
    isClass(mirror: TypeMirror): mirror is ClassMirror;
    isTypeAlias(mirror: TypeMirror): mirror is TypeAliasMirror;
    isInterfaceLiteral(mirror: TypeMirror): mirror is InterfaceLiteralMirror;
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

// TODO: Reflect functions for props
// TODO: Reflect module-level functions
// TODO: Reflect module-level vars