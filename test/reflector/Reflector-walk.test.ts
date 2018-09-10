
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
                walkNS(reflector, module, 0, '');
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

function walkNS(reflector: Reflector, ns: ModuleMirror | NamespaceMirror, depth: number, path: string) {
    assertDepth(depth);
    const currentPath = `${path} ${ns.name}`;

    for (const member of ns.members) {
        assert(member, 'no missing members');
        assert.equal(typeof member.mirrorKind, 'string', 'Must have a mirrorKind');

        if (reflector.isNamespace(member)) {
            walkNS(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isArray(member)) {
            assertTypeBasics(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isProperty(member)) {
            walkProperty(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isInterface(member)) {
            walkInterfaceLike(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isEnum(member)) {
            walkEnum(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isClass(member)) {
            walkInterfaceLike(reflector, member, depth + 1, currentPath);
            if (member.constructorMirror) {
                walkCallable(reflector, member.constructorMirror, depth + 1, currentPath);
            }
        }
        else if (reflector.isTypeAlias(member)) {
            assertTypeBasics(reflector, member.targetDefinition, depth + 1, currentPath);
        }
        else if (reflector.isCallable(member)) {
            walkCallable(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isObjectLiteral(member)) {
            walkInterfaceLike(reflector, member, depth + 1, currentPath);
        }
        else {
            assertNever(member, 'walkNS');
        }
    }
}

function assertTypeBasics(reflector: Reflector, mirror: TypeMirror, depth: number, path:string) {
    assertDepth(depth);
    const currentPath = `${path} ${mirror.name}`;


    for (const arg of mirror.typeArguments) {
        assert(arg, 'type args should exist');
        assertTypeBasics(reflector, arg, depth + 1, currentPath);
    }

    if (reflector.isInterfaceLiteral(mirror)) {
        walkInterfaceLike(reflector, mirror, depth + 1, currentPath);
    }
}

function walkProperty(reflector: Reflector, mirror: PropertyMirror, depth: number, path: string) {
    assertDepth(depth);
    const currentPath = `${path} ${mirror.name}`;

    assert(mirror.name, 'properties must have names');
    assert(mirror.type, 'properties must have a type');
    assertTypeBasics(reflector, mirror.type, depth + 1, currentPath);
}

function walkInterfaceLike(reflector: Reflector, mirror: InterfaceLike | ObjectLiteralMirror, depth: number, path: string) {
    assertDepth(depth);
    const currentPath = `${path} ${mirror.name}`;

    const members = mirror.members;
    assert(members, 'must have members array');
    
    for (const member of members) {
        assert(member, 'no missing members');

        if (reflector.isProperty(member)) {
            walkProperty(reflector, member, depth + 1, currentPath);
        }
        else if (reflector.isCallable(member)) {
            walkCallable(reflector, member, depth + 1, currentPath);
        }
        else {
            assertNever(member, 'walkInterfaceLike');
        }
    }

    let count = 0;
    count = count + mirror.properties.length;

    if (reflector.isInterfaceLike(mirror)) {
        count += mirror.methods.length;
    }

    if (reflector.isClass(mirror)) {
        if (mirror.constructorMirror) {
            count++;
        }
    }

    assert.equal(count, members.length, `${currentPath} - members should add up to other sub-lists total`);   
}

function walkEnum(reflector: Reflector, mirror: EnumMirror, depth: number, path: string) {
    assertDepth(depth);
    const currentPath = `${path} ${mirror.name}`;

    for (const member of mirror.members) {
        assert(member, 'no missing members');
        assert(member.name, 'enum members must have names');
        if (typeof member.defaultValue !== 'undefined') {
            assert.equal(typeof member.defaultValue, 'string', 'enum members should only have JS strings for defaultValue');
        }
    }
}

function walkCallable(reflector: Reflector, mirror: CallableMirror, depth: number, path: string) {
    assertDepth(depth);
    const currentPath = `${path} ${mirror.name}`;

    for (const sig of mirror.signatures) {
        assertTypeBasics(reflector, sig.returnType, depth + 1, currentPath);
        for (const param of sig.parameters) {
            assertTypeBasics(reflector, param.type, depth + 1, currentPath);
        }
    }
}