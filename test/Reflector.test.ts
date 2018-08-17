
import * as fs from '../src/fsPromises';
import { typedocReflector } from '../src/reflector/TSDocReflector';

describe('TSDoc Reflector', () => {

    let jsonSource = '';
    let jsonObj: any = {};

    beforeAll(async () => {
        return fs.readFile(__dirname + '/types-sample.json', 'UTF8')
            .then(contents => { jsonSource = contents });
    })

    beforeEach(() => {
        jsonObj = JSON.parse(jsonSource);
    });

    test('creation', () => {
        const reflector = typedocReflector(jsonObj);
        expect(reflector).toBeDefined();
    });
});