
import * as fs from '../../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror, NamespaceMirror, EnumMirror, InterfaceLike, ObjectLiteralMirror, CallableMirror } from '../../src/reflector/Reflector';

const MAX_DEPTH = 50;

describe('TSDoc Reflector, tree walk', () => {
    walkReflector('PoC', 'types-sample.json');
    walkReflector('Self', 'self-types.json');
    walkReflector('Self - test', 'self-test-types.json');
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
        assert.equal(typeof member.mirrorKind, 'string', 'Must have a mirrorKind');

        if (reflector.isNamespace(member)) {
            walkNS(reflector, member, depth + 1);
        }
        else if (reflector.isArray(member)) {
            assertTypeBasics(reflector, member, depth + 1);
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
            if (member.constructorMirror) {
                walkCallable(reflector, member.constructorMirror, depth + 1);
            }
        }
        else if (reflector.isTypeAlias(member)) {
            assertTypeBasics(reflector, member.targetDefinition, depth + 1);
        }
        else if (reflector.isCallable(member)) {
            walkCallable(reflector, member, depth + 1);
        }
        else if (reflector.isObjectLiteral(member)) {
            walkInterfaceLike(reflector, member, depth + 1);
        }
        else {
            assertNever(member, 'walkNS');
        }
    }
}

function assertTypeBasics(reflector, mirror: TypeMirror, depth: number) {
    assertDepth(depth);

    for (const arg of mirror.typeArguments) {
        assert(arg, 'type args should exist');
        assertTypeBasics(reflector, arg, depth + 1);
    }

    // TODO: If type is a literal, explore it some
}

function walkProperty(reflector: Reflector, property: PropertyMirror, depth: number) {
    assertDepth(depth);
    assert(property.name, 'properties must have names');
    assert(property.type, 'properties must have a type');
    assertTypeBasics(reflector, property.type, depth + 1);
}

function walkInterfaceLike(reflector: Reflector, mirror: InterfaceLike | ObjectLiteralMirror, depth: number) {
    assertDepth(depth);

    assert(mirror.members, 'must have members array');
    
    for (const member of mirror.members) {
        assert(member, 'no missing members');

        if (reflector.isProperty(member)) {
            walkProperty(reflector, member, depth + 1);
        }
        else if (reflector.isCallable(member)) {
            walkCallable(reflector, member, depth + 1);
        }
        else {
            assertNever(member, 'walkInterfaceLike');
        }
    }

    // TODO: Compare members count to cumulative sub-lists count
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

function walkCallable(reflector: Reflector, mirror: CallableMirror, depth: number) {
    assertDepth(depth);

    for (const sig of mirror.signatures) {
        assertTypeBasics(reflector, sig.returnType, depth + 1);
        for (const param of sig.parameters) {
            assertTypeBasics(reflector, param.type, depth + 1);
        }
    }
}