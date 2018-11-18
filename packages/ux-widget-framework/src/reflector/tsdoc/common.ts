
/**
 * Known (interesting) KindStrings. 
 * 
 * The original TypeScript kinds are a non-explicit enum, so the integer values may drift across TSC versions, we're stuck with 
 * using the strings for now.
 * 
 * TODO: Figure out where TypeDoc gets these from, and use them. 
 */
export enum KindString {
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
    SetSignature = 'Set signature',
    TypeAlias = 'Type alias',
    TypeLiteral = 'Type literal',
    TypeParameter = 'Type parameter',
    Variable = 'Variable',
}

/**
 * The subset of module-level kinds we're looking at for individual entries in the documentation
 */
export const typeDefKinds = [
    KindString.Class,
    KindString.Interface,
    KindString.TypeAlias,
    KindString.Enumeration,
    KindString.ExternalModule
];

/**
 * KindStrings that make up "properties"
 */
export const propertyKindStrings = [
    KindString.Property,
    KindString.Variable
    // TODO: Getters / setters
]
