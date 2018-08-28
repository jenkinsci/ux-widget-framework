
import * as fs from '../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../src/reflector/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector } from '../src/reflector/Reflector';

describe('TSDoc Reflector, PoC types', () => {

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

    test('module names', () => {
        const reflector = typedocReflector(jsonObj);
        const moduleNames = reflector.moduleNames;

        moduleNames.sort();

        assert(Array.isArray(moduleNames), 'moduleNames is array');
        assert.equal(moduleNames.length, 10, 'number of modules');
        assert.equal(moduleNames.join(', '),
            'Extensions, PipelineGraph, PipelineGraphLayout, PipelineGraphModel, ' +
            'index, support/SVG, support/StatusIndicator, support/SvgSpinner, ' +
            'support/SvgStatus, support/TruncatingLabel', 'Modules listed');
    });

    test('findClassByName', () => {
        const reflector = typedocReflector(jsonObj);

        let matches = reflector.findClassesByName('NotAValidName');
        assert.equal(matches.length, 0, 'no matches for NotAValidName');

        matches = reflector.findClassesByName('PipelineGraph');
        assert.equal(matches.length, 1, 'One match for PipelineGraph');
        assert.equal(matches[0], 486, 'Correct id for PipelineGraph');

        matches = reflector.findClassesByName('TruncatingLabel');
        assert.equal(matches.length, 1, 'One match for TruncatingLabel');
        assert.equal(matches[0], 340, 'Correct id for TruncatingLabel');

        matches = reflector.findClassesByName('RenderState');
        assert.equal(matches.length, 0, 'No matches for RenderState'); // RenderState is an enum
    });

    test('describe class PipelineGraph', () => {
        const reflector = typedocReflector(jsonObj);
        const mirror = reflector.describeTypeById(486);

        assert(mirror, 'PipelineGraph Mirror should be defined');
        assert(mirror.isComplex, 'PipelineGraph Mirror should be complex');

        if (!reflector.isInterface(mirror)) {
            throw new Error("PipelineGraph Mirror should be InterfaceMirror");
        }

        if (!reflector.isClass(mirror)) {
            throw new Error("PipelineGraph Mirror should be ClassMirror");
        }

        const propertyNames = mirror.propertyNames;
        propertyNames.sort();

        assert.equal(propertyNames.join(', '),
            'context, props, refs, state, subscriptions',
            'propertyNames');

        // TODO: Add and test an "all children names" alongside "propertynames"
    });

    test('describe property PipelineGraph.props', () => {
        const reflector = typedocReflector(jsonObj);
        const classMirror = reflector.describeTypeById(486) as ClassMirror;
        const propMirror = classMirror.describeProperty('props');

        assert(propMirror, 'prop mirror should exist');

        assert.equal(propMirror.name, 'props', 'name should be correct');
    });

    describe('describe type of PipelineGraph.props', () => {
        let reflector: Reflector;
        let interfaceMirror;

        beforeAll(() => {
            reflector = typedocReflector(jsonObj);
            interfaceMirror = reflector.describeTypeById(459);
        });

        test('Props type mirror', () => {
            assert(interfaceMirror, 'must find mirror');
            assert.equal(interfaceMirror.name, 'Props', 'type name');

            if (!reflector.isInterface(interfaceMirror)) {
                throw new Error('Props type should be interface');
            }

            const propertyNames = interfaceMirror.propertyNames;
            propertyNames.sort();

            assert.equal(propertyNames.join(', '),
                'assetURLBase, layout, onNodeClick, resourceBundle, selectedStage, stages, trafficStateChanged',
                'propertyNames');
            // TODO: Add and test an "all children names" alongside "propertynames"
        });

        function testProp(name: string, f?: (PropertyMirror, TypeMirror) => void) {
            test(name, () => {
                const propMirror: PropertyMirror = interfaceMirror.describeProperty(name);
                assert(propMirror, 'must get typeMirror');
                assert.equal(propMirror.name, name, 'must report back correct name');

                const typeMirror = propMirror.type;
                assert(typeMirror, 'should be able to find a type!');

                if (f) {
                    f(propMirror, typeMirror);
                }
            })
        }

        testProp('assetURLBase', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(propMirror.hasComment, false, 'prop has comment?');
            assert.equal(typeMirror.isComplex, false, 'type is complex?');
            assert.equal(typeMirror.isBuiltin, true, 'type is builtin?');
        });

        testProp('layout', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'LayoutInfo', 'type name');

            if (!reflector.isTypeAlias(typeMirror)) {
                throw new Error('prop type should be type alias');
            }

            assert.equal(reflector.isTypeAlias(typeMirror), true, 'type is TypeAliasMirror');
            assert.equal(typeMirror.isComplex, false, 'type is complex?');
            assert.equal(typeMirror.isBuiltin, false, 'type is builtin?');

            const targetType = typeMirror.targetDefinition;

            if (!reflector.isInterfaceLiteral(targetType)) {
                throw new Error('targetType should be InterfaceLiteralMirror')
            }

            assert.equal(targetType.name, '__type', 'targetType should have anonymous name placeholder');

            const expectedTargetProps = [
                'connectorStrokeWidth',
                'curveRadius',
                'labelOffsetV',
                'nodeRadius',
                'nodeSpacingH',
                'nodeSpacingV',
                'parallelSpacingH',
                'smallLabelOffsetV',
                'terminalRadius',
                'ypStart'
            ];

            const targetProps = targetType.propertyNames;
            targetProps.sort();
            assert.equal(targetProps.join(', '), expectedTargetProps.join(', '), 'target type children');

            // Make sure we can at least construct reflectors for all these props
            for (const propName of expectedTargetProps) {
                const mirror = targetType.describeProperty(propName);
                assert.equal(mirror.name, propName, 'target type prop mirror name');
            }

            // TODO: Add and test an "all children names" alongside "propertynames"


        });

        testProp('onNodeClick', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            if (!reflector.isUnion(typeMirror)) {
                throw new Error('Expected a union');
            }

            assert(typeMirror.types[0] === reflector.builtinUndefined, 'first branch should be undefined');

            const otherdef = typeMirror.types[1];

            // assert.equal(otherdef.name, 'blah', 'other def name');
        });

        testProp('resourceBundle');

        testProp('selectedStage');

        testProp('stages');

        testProp('trafficStateChanged');

    });

    // TODO: Tests to make sure you can get all the builtins via their hardcoded IDs
});