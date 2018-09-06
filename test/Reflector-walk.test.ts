
import * as fs from '../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror } from '../src/reflector/Reflector';

describe('TSDoc Reflector, tree walk', () => {
    walkReflector('PoC', 'types-sample.json');
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

        // test('can walk the tree', () => {
        //     const mirror = typedocReflector(jsonObj);
        //     const modules = mirror.modules;

        //     assert(Array.isArray(modules),'must be able to get modules');
        //     assert(modules.length, 'must have some modules');
        // });
    });
}