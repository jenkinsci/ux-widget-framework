
import * as fs from '../../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror, MirrorKind } from '../../src/reflector/Reflector';

describe('TSDoc Reflector, Test types', () => {

    let jsonSource = '';
    let jsonObj: any = {};
    let reflector: Reflector;

    beforeAll(async () => {
        return fs.readFile(__dirname + '/self-test-types.json', 'UTF8')
            .then(contents => { jsonSource = contents });
    })

    beforeEach(() => {
        jsonObj = JSON.parse(jsonSource);
        reflector = typedocReflector(jsonObj);
    });

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
            const props = mirror.properties.sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

            assert.equal(props.length, 4, 'props count');

            let prop = props[0];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Property, 'mirrorKind')
            assert.equal(prop.name, 'prop1', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert(prop.type, 'must have a type');

            prop = props[1];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop2', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, false, 'writeable?');
            assert(prop.type, 'must have a type');

            prop = props[2];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop3', 'name');
            assert.equal(prop.readable, false, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert(prop.type, 'must have a type');

            prop = props[3];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Accessor, 'mirrorKind')
            assert.equal(prop.name, 'prop4', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
            assert(prop.type, 'must have a type');
        });
    });

    // TODO: Tests for IndexSignature as a literal
    // TODO: Tests for IndexSignature as part of an interface
    // TODO: Tests for Intersection
});

/**
 * This class isn't used directly, it's just here to be reflected on.
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
    }

    get prop4(): string {
        return 'prop 4 value';
    }

    set prop4(aNewValue: string) {
        console.log('set prop4', aNewValue);
    }
}

interface Fragment1 {
    foo: string;
}

interface Fragment2 {
    bar: number;
}

type TestIntersection = Fragment1 & Fragment2;