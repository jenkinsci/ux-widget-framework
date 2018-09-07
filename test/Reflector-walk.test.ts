
import * as fs from '../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror, NamespaceMirror, EnumMirror, InterfaceLike } from '../src/reflector/Reflector';

const MAX_DEPTH = 50;

describe('TSDoc Reflector, tree walk', () => {
    walkReflector('PoC', 'types-sample.json');
    walkReflector('Self', 'self-types.json');
});

function walkReflector(name: string, filepath: string) {
    describe(name, () => {
        let jsonSource = '';
        let jsonObj: any = {};

        beforeAll(async () => {
            return fs.readFile(`${__dirname}/${filepath}`, 'UTF8')
                .then(contents => { jsonSource = contents });

        })

        beforeEach(() => {
            jsonObj = JSON.parse(jsonSource);
        });

        test('can construct', () => {
            assert(typedocReflector(jsonObj));
        });

        test('can walk the tree', () => {
            const reflector = typedocReflector(jsonObj);
            const modules = reflector.modules;

            assert(Array.isArray(modules), 'must be able to get modules');
            assert(modules.length, 'must have some modules');

            for (const module of modules) {
                walkNS(reflector, module, 0);
            }
        });
    });
}

function assertNever(x: never, sender: string): never {
    const obj = x as any;
    throw new Error(`${sender} - Unexpected object: ${obj.constructor.name}`);
}

function assertDepth(depth) {
    if (depth > MAX_DEPTH) {
        throw new Error(`Abandoning tree walk due to reaching depth ${depth}`);
    }
}

function walkNS(reflector: Reflector, ns: ModuleMirror | NamespaceMirror, depth: number) {
    assertDepth(depth);

    for (const member of ns.members) {
        assert(member, 'no missing members');

        if (reflector.isNamespace(member)) {
            walkNS(reflector, member, depth + 1);
        }
        else if (reflector.isArray(member)) {
            for (const arg of member.typeArguments) {
                assert(arg, 'type args should exist');
                assertTypeBasics(reflector, arg, depth + 1);
            }
        }
        else if (reflector.isProperty(member)) {
            walkProperty(reflector, member, depth + 1);
        }
        else if (reflector.isInterface(member)) {
            walkInterfaceLike(reflector, member, depth + 1);
        }
        else if (reflector.isEnum(member)) {
            walkEnum(reflector, member, depth + 1);
        }
        else if (reflector.isClass(member)) {
            walkInterfaceLike(reflector, member, depth + 1);
            
        }
        else if (reflector.isTypeAlias(member)) { /* TODO: explore */ }
        else if (reflector.isCallable(member)) { /* TODO: explore */ }
        else if (reflector.isObjectLiteral(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        else {
            assertNever(member, 'walkNS');
        }
    }
}

function assertTypeBasics(reflector, mirror: TypeMirror, depth: number) {
    assertDepth(depth);
    // TODO: If type is a literal, explore it some
}

function walkProperty(reflector: Reflector, property: PropertyMirror, depth: number) {
    assertDepth(depth);
    assert(property.name, 'properties must have names');
    assert(property.type, 'properties must have a type');
    assertTypeBasics(reflector, property.type, depth + 1);
}

function walkInterfaceLike(reflector: Reflector, mirror: InterfaceLike, depth: number) {
    assertDepth(depth);

    for (const member of mirror.members) {
        assert(member, 'no missing members');

        if (reflector.isProperty(member)) { /* TODO: explore */ }
        else if (reflector.isCallable(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        // else if (reflector.isXXXX(member)) { /* TODO: explore */ }
        else {
            assertNever(member, 'walkInterfaceLike');
        }
    }
}

function walkEnum(reflector: Reflector, mirror: EnumMirror, depth: number) {
    assertDepth(depth);

    for (const member of mirror.members) {
        assert(member, 'no missing members');
        assert(member.name, 'enum members must have names');
        if (typeof member.defaultValue !== 'undefined') {
            assert.equal(typeof member.defaultValue, 'string', 'enum members should only have JS strings for defaultValue');
        }
    }
}