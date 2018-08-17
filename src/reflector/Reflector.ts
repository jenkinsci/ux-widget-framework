
/**
 * Base reflector interface, represents a "typespace". 
 */
export interface Reflector {

    describeClass(className: string): ClassMirror;
    describeTypeById(id: number): TypeMirror;

    debug(): string;
};

export interface Mirror {
    getReflector(): Reflector;

    readonly id: number;
    readonly name: string;
    readonly kindString: string;
}

export interface TypeMirror {
    isComplex(): boolean;

    hasComment(): boolean;
    getCommentShortText(): string;
    getCommentLongText(): string;
}

export interface InterfaceMirror extends Mirror, TypeMirror {
    describeProperty(propName: string): PropertyMirror;
    propertyNames(): Array<string>;
}

export interface ClassMirror extends InterfaceMirror { }

export interface PropertyMirror extends Mirror {
    getTypeId(): number;
}
