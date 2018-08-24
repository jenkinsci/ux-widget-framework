
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

    debug(): string;
};

/**
 * Common properties across all defs we're interested in
 */
interface Mirror {
    /** "root" typespace */
    getReflector(): Reflector; // TODO: Do we need this in the public interface?

    /** 
     * Id Number 
     * 
     * Only valid within the root typespace 
     */
    readonly id: number;

    /** Declared name */
    readonly name: string;

    /** Kind as string */
    readonly kindString: string;
}

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
}

/**
 * Represents a typedef, might be a Class or Interface, Enum, or just a type alias
 */
export interface TypeMirror extends Mirror, SupportsDocComments {
    /** Complex types would include classes, interfaces, enums */
    readonly isComplex: boolean;

    /**
     * Is builtin (number, string, Date, etc)
     */
    readonly isBuiltin: boolean;

    /**
     * Is primitive ( Boolean, Null, Undefined, Number, String, Symbol )
     */
    readonly isPrimitive: boolean;
}

/**
 * Represents a type alias
 */
export interface TypeAliasMirror extends TypeMirror {
    /**
     * The definition (RHS) of this alias
     */
    readonly targetDefinition: TypeMirror;
}

/**
 * Represents an interface/class/literal definition, which has child properties and methods
 */
export interface InterfaceLike extends TypeMirror {
    // TODO: Not sure if this can haz doc comments, maybe remove it from TypeMirror
    
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
export interface InterfaceLiteralMirror extends InterfaceLike {}

/**
 * Represents a TS interface decl
 */
export interface InterfaceMirror extends InterfaceLike {
    readonly isAbstract: boolean;
}

/**
 * Represents a TS class
 */
export interface ClassMirror extends InterfaceMirror { 
    // TODO: readonly constructor: FunctionMirror
}

/**
 * Represents a property definition within an interface, class, interface literal or module
 */
export interface PropertyMirror extends Mirror, SupportsDocComments {
    /**
     * Reflect the type of this property
     */
    readonly typeMirror: TypeMirror;
}

// TODO: Reflect functions for props
// TODO: Reflect module-level functions
// TODO: Reflect module-level vars