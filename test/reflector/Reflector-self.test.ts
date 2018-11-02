
import * as fs from '../../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror, MirrorKind, IntersectionMirror } from '../../src/reflector/Reflector';
import { any } from 'prop-types';

const nameComparator = (a:any, b:any) => {
    if (a.name < b.name) {
        return -1;
    }
    if (a.name > b.name) {
        return 1;
    }
    return 0;
}

describe('TSDoc Reflector, Test types', () => {

    let jsonSource = '';
    let jsonObj: any = {};
    let reflector: Reflector;
    let thisModule: ModuleMirror;
    beforeAll(async () => {
        return fs.readFile(__dirname + '/self-test-types.json', 'UTF8')
            .then(contents => { jsonSource = contents });
    })

    beforeEach(() => {
        jsonObj = JSON.parse(jsonSource);
        reflector = typedocReflector(jsonObj);
        thisModule = reflector.modules.find(member => member.originalName.indexOf(__filename) >= 0) as any;
    });

    test('thismodule member names', () => {
        const names = thisModule.members.map(member => member.name).sort();

        assert.equal(
            names.join(', '), 
            'Fragment1, Fragment2, IndexSig1, IndexSig2, IndexSig3, LinkedList, TestClass1, TestIntersection, indexSig4, nameComparator, objectLiteralProp', 
            'member names');
    })

    describe('TestClass1', () => {

        let mirror: ClassMirror;

        beforeEach(() => {
            mirror = reflector.findClassesByName('TestClass1')[0];
        })

        test('constructs', () => {
            assert(mirror, 'mirror constructed');
        });

        test('members', () => {
            const members = mirror.members;
            assert(members, 'members exists');
            assert(members.length, 'has members');

            for (const member of members) {
                assert(member, 'no missing members');
            }
        });

        test('properties', () => {
            const props = mirror.properties.sort(nameComparator);

            assert.equal(props.length, 7, 'props count');

            let prop = props[0];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Property, 'mirrorKind')
            assert.equal(prop.name, 'prop1', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert.equal(prop.isStatic, false, 'static?');
            assert(prop.type, 'must have a type');

            prop = props[1];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop2', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, false, 'writeable?');
            assert.equal(prop.isStatic, false, 'static?');
            assert(prop.type, 'must have a type');

            prop = props[2];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop3', 'name');
            assert.equal(prop.readable, false, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert.equal(prop.isStatic, false, 'static?');
            assert(prop.type, 'must have a type');

            prop = props[3];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop4', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert.equal(prop.isStatic, false, 'static?');
            assert(prop.type, 'must have a type');

            prop = props[4];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Property, 'mirrorKind')
            assert.equal(prop.name, 'prop5', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert.equal(prop.isStatic, false, 'static?');
            assert(prop.type, 'must have a type');

            let aType = prop.type;

            if (!reflector.isTypeAlias(aType)) {
                throw new Error(`should be alias, got ${aType.constructor.name}`);
            }

            assert.equal(aType.mirrorKind, MirrorKind.TypeAlias, 'mirrorKind should be type alias');

            aType = aType.targetDefinition;

            if (!reflector.isIntersection(aType)) {
                throw new Error(`should be intersection, got ${aType.constructor.name}`)
            }

            assert.equal(aType.mirrorKind, MirrorKind.Intersection, 'mirrorKind should be intersection');

            prop = props[5];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Property, 'mirrorKind')
            assert.equal(prop.name, 'prop6', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert.equal(prop.isStatic, true, 'static?');

            prop = props[6];
            
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind');
            assert.equal(prop.isStatic, true, 'static?');
        });

        test('method.isStatic', () => {
            const methods = mirror.methods.sort(nameComparator);
            assert.equal(methods.length, 2, 'methods count');

            assert.equal(methods[0].isStatic, false, 'method 0 static?');
            assert.equal(methods[1].isStatic, true, 'method 1 static?');
        })
    });

    describe('TestIntersection', () => {

        let mirror: IntersectionMirror;

        beforeEach(() => {
            const namedType = thisModule && thisModule.members.find(member => member.name === 'TestIntersection');
            mirror = reflector.isTypeAlias(namedType) ? namedType.targetDefinition as any : undefined;
        })

        test('constructs', () => {
            assert(thisModule, 'thisModule located');
            assert(mirror, 'TestIntersection mirror located');
            assert.equal(mirror.mirrorKind, MirrorKind.Intersection, 'TestIntersection mirror correct type');
        });

        test('members', () => {
            const members = mirror.members;

            assert(members, 'intersection should have members')
            assert.equal(members.length, 2, 'expecting 2 member types');

            members.sort(nameComparator);

            let member = members[0];
            assert(member, 'no missing members');
            assert.equal(member.name, 'Fragment1', 'member name');
            assert(reflector.isInterface(member), 'member should be interface');

            member = members[1];
            assert(member, 'no missing members');
            assert.equal(member.name, 'Fragment2', 'member name');
            assert(reflector.isInterface(member), 'member should be interface');
        });
    });

    describe('Index Signatures', () => {

        let sig1:any;
        let sig2:any;
        let sig3:any;
        let sig4:any;

        beforeEach(() => {
            const members = thisModule.members;
            sig1 = members.find(m => m.name === 'IndexSig1');
            sig2 = members.find(m => m.name === 'IndexSig2');
            sig3 = members.find(m => m.name === 'IndexSig3');
            sig4 = members.find(m => m.name === 'indexSig4');
        });

        test('sig1', () => {
            assert(sig1, 'found sig1');
            if (!reflector.isInterface(sig1)) {
                throw new Error(`expected interface, got ${sig1.constructor.name}`);
            }

            const members = sig1.members;
            assert.equal(members.length, 0, 'should have no members');

            const indexSig = sig1.indexSignature;
            assert(indexSig, 'should have index signature');

            const indexType = indexSig!.indexType;
            const valueType = indexSig!.valueType;

            assert(indexType, 'should have index type');
            assert(valueType, 'should have value type');

            assert.equal(indexType.isBuiltin, true, 'index type builtin?');
            assert.equal(indexType.name, 'string', 'index type name');

            assert.equal(valueType.isBuiltin, true, 'index type builtin?');
            assert.equal(valueType.name, 'any', 'index type name');
        });

        test('sig2', () => {
            assert(sig2, 'found sig2');
            if (!reflector.isInterface(sig2)) {
                throw new Error(`expected interface, got ${sig2.constructor.name}`);
            }

            const members = sig2.members;
            assert.equal(members.length, 1, 'should have 1 member');

            const prop = sig2.properties[0];
            assert(prop, 'should have a prop');
            assert.equal(prop.name, 'foo', 'prop name');
            assert.equal(prop.type.name, 'string', 'prop type');

            const indexSig = sig2.indexSignature;
            assert(indexSig, 'should have index signature');

            const indexType = indexSig!.indexType;
            const valueType = indexSig!.valueType;

            assert(indexType, 'should have index type');
            assert(valueType, 'should have value type');

            assert.equal(indexType.isBuiltin, true, 'index type builtin?');
            assert.equal(indexType.name, 'string', 'index type name');

            assert.equal(valueType.isBuiltin, true, 'index type builtin?');
            assert.equal(valueType.name, 'any', 'index type name');
        });

        test('sig3', () => {
            assert(sig3, 'found sig 3');

            if (!reflector.isTypeAlias(sig3)) {
                throw new Error(`expected type alias, found a ${sig3.constructor.name}`);
            }

            const iface = sig3.targetDefinition;

            if (!reflector.isInterfaceLiteral(iface)) {
                throw new Error(`Expected interface literal, got a ${iface.constructor.name}`);
            }

            assert.equal(iface.members.length, 1, 'should have one normal member');
            assert(iface.indexSignature, 'should have an index signature');
        });

        test('sig4', () => {
            assert(sig4, 'found sig 4');

            if (!reflector.isProperty(sig4)) {
                throw new Error(`expected property, found a ${sig4.constructor.name}`);
            }

            const type = sig4.type;

            if (!reflector.isInterfaceLiteral(type)) {
                throw new Error(`Expected interface literal got ${type.constructor.name}`);
            }

            assert.equal(type.members.length, 0, 'should have no normal members');
            assert(type.indexSignature, 'should have index sig');
        });

    });

    describe('objectLiteralProp', () => {

        let mirror:any;

        beforeEach(() => {
            const members = thisModule.members;
            mirror = members.find(m => m.name === 'objectLiteralProp');
        });

        test('get methods on object literals', () => {
            assert(mirror, 'mirror found');

            if (!reflector.isObjectLiteral(mirror)) {
                throw new Error(`Expected object literal, found ${mirror.constructor.name}`);
            }

            const methods = mirror.methods;

            assert(methods, 'found methods array');
            assert.equal(methods.length, 1, 'method count');

            const method = methods[0];
            assert.equal(method.name, 'crystal', 'method name');
        });
    });
});

/**
 * The following decls aren't used directly, it's just here to be reflected on.
 * 
 * NB: run /generate-test-data.sh to update the stored json if you change this!
 */
class TestClass1 {
    prop1: string = 'prop1 default value';

    get prop2(): number {
        return 8;
    }

    set prop3(aDate: Date) {
        console.log('set date', aDate);
        console.log('indexSig4 is', indexSig4);
    }

    get prop4(): string {
        return 'prop 4 value';
    }

    set prop4(aNewValue: string) {
        console.log('set prop4', aNewValue);
    }

    prop5!: TestIntersection;

    static prop6: string = 'nuts';

    static get prop7(): string {
        return 'foo';
    }

    meth1(input: any) {
        console.log('meth1', input);
    }

    static meth2(input:any) {
        console.log('meth2', input);
    }
}

interface Fragment1 {
    foo: string;
}

interface Fragment2 {
    bar: number;
}

type TestIntersection = Fragment1 & Fragment2;

interface IndexSig1 { [k: string]: any };

interface IndexSig2 {
    foo: string;
    [k: string]: any;
};

type IndexSig3 = {
    bar: number;
    [k: string]: any;
}

export let indexSig4: { [k: string]: any } = {};

export interface LinkedList {
    data: any;
    head: LinkedList;
    next?: LinkedList;
}

export const objectLiteralProp = {
    prop0: 7,
    prop1: "hello",

    crystal(foo: string) {
        console.log('foo was', foo);
    }
}