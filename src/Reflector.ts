import * as fs from './fsPromises';

/**
 * Base reflector interface. 
 * 
 * This is not a meant to be a generic re-usable reflector, it's specific to the task of generating Widget Docs.
 */
export interface Reflector {

    describeClass(className: string): ClassMirror;
    describeTypeById(id: number): TypeMirror;

    debug(): string;
};

export interface Mirror {
    getReflector(): Reflector;
}

export interface TypeMirror {
    isComplex(): boolean;

    getId(): number;
    getName(): string;
    getKindString(): string;

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

export function typedocReflector(filePath: string): Promise<Reflector> {
    return fs.readFile(filePath, 'UTF8').then((fileString: string) => {
        const reflector = new TypedocJSONReflector();
        reflector.readJSON(JSON.parse(fileString));
        return reflector as Reflector;
    });
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
    ExternalModule = 'External module',
    Class = 'Class',
    Constructor = 'Constructor',
    Property = 'Property',
    Method = 'Method',
    Interface = 'Interface',
    TypeAlias = 'Type alias',
    Module = 'Module',
    Variable = 'Variable',
    Enumeration = 'Enumeration',
    EnumerationMember = 'Enumeration member',
    Function = 'Function'
}

/**
 * The subset of module-level kinds we're looking at for individual entries in the documentation
 */
const typeKinds = [KindString.Class, KindString.Interface, KindString.TypeAlias, KindString.Enumeration];

// interface TDTypeDef {
//     // TODO: Name, refine
//     id: number,
//     kind: number,
//     kindString: string,
//     name: string,
// }

class TypedocJSONInterfaceMirrorBase {

    typeDesc: any;
    reflector: Reflector;

    constructor(reflector: Reflector, typeDesc: any) {
        this.reflector = reflector;
        this.typeDesc = typeDesc;
    }

    describeProperty(propName: string): PropertyMirror {
        let propDesc;

        for (const child of this.typeDesc.children) {
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

    getReflector(): Reflector {
        return this.reflector;
    }

    isComplex(): boolean {
        return true;
    }

    getId(): number {
        return this.typeDesc.id;
    }

    getName(): string {
        return this.typeDesc.name;
    }

    getKindString(): string {
        return this.typeDesc.kindString;
    }

    hasComment(): boolean {
        return !!this.typeDesc.comment;
    }

    getCommentShortText(): string {
        const comment = this.typeDesc.comment;
        return comment && comment.shortText || '';
    }

    getCommentLongText(): string {
        const comment = this.typeDesc.comment;
        return comment && comment.text || '';
    }

    propertyNames(): Array<string> {
        return this.typeDesc.children
            .filter((child: any) => child.kindString === KindString.Property)
            .map((child: any) => child.name);
    }
}

class TypedocJSONInterfaceMirror extends TypedocJSONInterfaceMirrorBase implements InterfaceMirror { }

class TypedocJSONClassMirror extends TypedocJSONInterfaceMirrorBase implements ClassMirror { }

class TypedocJSONPropertyMirror implements PropertyMirror {

    parent: ClassMirror;
    propDesc: any;

    constructor(parent: ClassMirror, propDesc: any) {
        this.parent = parent;
        this.propDesc = propDesc;
    }

    getReflector(): Reflector {
        return this.parent.getReflector();
    }

    getTypeId(): number {
        const typeDecl = this.propDesc.type;

        if (typeDecl && typeDecl.type === 'reference') {
            return typeDecl.id;
        }

        throw new Error(`getTypeId: do not understand typeDecl ${JSON.stringify(typeDecl)}`);
    }
}

class TypedocJSONReflector implements Reflector {

    typeNames: Array<string> = [];
    shapes: { [k: string]: number } = {};
    keys: { [k: string]: number } = {};
    ids: { [k: string]: number } = {};
    kinds: Array<string> = [];

    /** Interesting types' definitions */
    typeDefs: Array<any> = [];

    total = 0;

    readJSON(obj: any) {
        this.explore(obj);
        this.typeNames.sort();
    }

    explore(obj: any) {

        this.total++;

        // Index any interesting typedefs
        if (obj.name && obj.kindString && typeKinds.indexOf(obj.kindString) >= 0) {
            this.typeDefs.push(obj);
        }

        // Build names index
        if (obj.name) {
            this.typeNames.push(obj.name);
        } else {
            console.log('Object with no name, but', Object.keys(obj));
        }

        if (obj.id) {
            this.ids[obj.id] = obj.id;
        }

        // Kinds
        if (obj.kind) {
            let kind = `${obj.kind} : ${obj.kindString || 'unknown'}`;
            if (this.kinds.indexOf(kind) === -1) {
                this.kinds.push(kind);
            }
        }

        // Build types index
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

    describeClass(className: string): ClassMirror {
        const td = this.typeDefs.find(td => (td.name === className && td.kindString === KindString.Class));

        if (!td) {
            throw new Error(`describeClass: could not find '${className}'`);
        }

        return new TypedocJSONClassMirror(this, td);
    }

    describeTypeById(id: number): TypeMirror {
        const td = this.typeDefs.find(td => td.id === id);

        if (!td) {
            throw new Error(`describeTypeById: type ${id} not found`);
        }

        if (td.kindString === KindString.Class) {
            return new TypedocJSONClassMirror(this, td);
        }

        if (td.kindString === KindString.Interface) {
            return new TypedocJSONInterfaceMirror(this, td);
        }

        throw new Error(`describeTypeById: no mirror for kind ${td.kindString}`);
    }


    debug(): string {
        let result = '';

        // result += 'Names:\n';
        // for (const name of this.typeNames) {
        //     result += `  * ${name}\n`;
        // }
        // result += '\n';

        // result += 'Shapes:\n';
        // let shapeLines = [];
        // for (const shape in this.shapes) {
        //     let count = ('000000' + this.shapes[shape]).substr(-3);
        //     shapeLines.push(`  * ${count} ${shape}\n`);
        // }
        // shapeLines.sort();
        // result += shapeLines.join('');
        // result += '\n';

        // result += 'Keys:\n';
        // let keyLines = [];
        // for (const key in this.keys) {
        //     let count = ('000000' + this.keys[key]).substr(-3);
        //     keyLines.push(`  * ${count} ${key}\n`);
        // }
        // keyLines.sort();
        // result += keyLines.join('');
        // result += '\n';

        // result += 'Kinds:\n';
        // for (const kind of this.kinds) {
        //     result += `  * ${kind}\n`;
        // }
        // result += '\n';


        // let ids = Object.keys(this.ids).sort();
        // result += `${ids.length} unique ids.\n`;

        result += 'Interesting Types:\n';
        for (const td of this.typeDefs) {
            result += `  * ${td.name} : ${td.kindString} id:${td.id}\n`;
        }
        result += '\n';

        result += `${this.total} total defs.\n`;

        return result;
    }
}