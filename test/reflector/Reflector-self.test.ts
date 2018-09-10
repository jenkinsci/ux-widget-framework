
import * as fs from '../../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror, MirrorKind, IntersectionMirror } from '../../src/reflector/Reflector';

const nameComparator = (a, b) => {
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
            const props = mirror.properties.sort(nameComparator);

            assert.equal(props.length, 5, 'props count');

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

            prop = props[4];
            assert.equal(reflector.isProperty(prop), true, 'is property');
            assert.equal(prop.mirrorKind, MirrorKind.Property, 'mirrorKind')
            assert.equal(prop.name, 'prop5', 'name');
            assert.equal(prop.readable, true, 'readable?');
            assert.equal(prop.writeable, true, 'writeable?');
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
        });
    });

    describe('TestIntersection', () => {

        let mirror: IntersectionMirror;
        let thisModule: ModuleMirror;

        beforeEach(() => {
            const modules = reflector.modules;
            thisModule = modules.find(member => member.originalName.indexOf(__filename) >= 0);
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

    // TODO: Tests for IndexSignature as a literal
    // TODO: Tests for IndexSignature as part of an interface
    // TODO: find and test usage of flags.isOptional
    // TODO: find and test usage of flags.isStatic
    // TODO: make a circular type (like a linked list or tree), export that as JSON and make sure we can reflect on it

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

    prop5: TestIntersection;
}

interface Fragment1 {
    foo: string;
}

interface Fragment2 {
    bar: number;
}

type TestIntersection = Fragment1 & Fragment2;