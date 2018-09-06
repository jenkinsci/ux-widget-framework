
import * as fs from '../src/fsPromises';
import * as assert from 'assert';
import { typedocReflector } from '../src/reflector/tsdoc/TSDocReflector';
import { InterfaceMirror, ClassMirror, TypeMirror, PropertyMirror, Reflector, ModuleMirror } from '../src/reflector/Reflector';

describe('TSDoc Reflector, PoC types', () => {

    let jsonSource = '';
    let jsonObj: any = {};

    const allModules = [
        'Extensions',
        'PipelineGraph',
        'PipelineGraphLayout',
        'PipelineGraphModel',
        'index',
        'support/SVG',
        'support/StatusIndicator',
        'support/SvgSpinner',
        'support/SvgStatus',
        'support/TruncatingLabel',
    ];

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
        assert.equal(moduleNames.join(', '), allModules.join(', '), 'Modules listed');

        for (const name of moduleNames) {
            const mirror = reflector.describeModule(name);
            assert(mirror, `can construct mirror for "${name}"`);
            assert.equal(mirror.name, name, `mirror for "${name}" has correct name`);
            assert(reflector.isModule(mirror), `mirror for "${name}" must be module`);
        }
    });

    test('findClassByName', () => {
        const reflector = typedocReflector(jsonObj);

        let matches = reflector.findClassesByName('NotAValidName');
        assert.equal(matches.length, 0, 'no matches for NotAValidName');

        matches = reflector.findClassesByName('PipelineGraph');
        assert.equal(matches.length, 1, 'One match for PipelineGraph');
        assert.equal(matches[0].name, 'PipelineGraph', 'Correct name for PipelineGraph');

        matches = reflector.findClassesByName('TruncatingLabel');
        assert.equal(matches.length, 1, 'One match for TruncatingLabel');
        assert.equal(matches[0].name, 'TruncatingLabel', 'Correct name for TruncatingLabel');

        matches = reflector.findClassesByName('RenderState');
        assert.equal(matches.length, 0, 'No matches for RenderState'); // RenderState is an enum
    });

    test('describe class PipelineGraph', () => {
        const reflector = typedocReflector(jsonObj);
        const mirror: TypeMirror = reflector.findClassesByName('PipelineGraph')[0];

        assert(mirror, 'PipelineGraph Mirror should be defined');
        assert(mirror.isComplex, 'PipelineGraph Mirror should be complex');

        if (reflector.isInterface(mirror)) {
            throw new Error("PipelineGraph Mirror should not be InterfaceMirror");
        }

        if (!reflector.isClass(mirror)) {
            throw new Error("PipelineGraph Mirror should be ClassMirror");
        }

        if (!reflector.isInterfaceLike(mirror)) {
            throw new Error("PipelineGraph Mirror should be InterfaceLike");
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
        const classMirror = reflector.findClassesByName('PipelineGraph')[0];
        const propMirror = classMirror.describeProperty('props');

        assert(propMirror, 'prop mirror should exist');

        assert.equal(propMirror.name, 'props', 'name should be correct');
    });

    describe('describe type of PipelineGraph.props', () => {
        let reflector: Reflector;
        let interfaceMirror;

        beforeAll(() => {
            reflector = typedocReflector(jsonObj);
            interfaceMirror = reflector.findClassesByName('PipelineGraph')[0].describeProperty('props').type;
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

            assert.strictEqual(typeMirror.members[0], reflector.builtinUndefined, 'first branch should be undefined');

            const otherdef = typeMirror.members[1];

            if (!reflector.isCallable(otherdef)) {
                throw new Error('expecting a callable for otherdef');
            }

            assert.equal(otherdef.signatures.length, 1, 'should have single signature');

            const sig = otherdef.signatures[0];

            assert(sig.returnType === reflector.builtinVoid, 'otherdef returns void');

            assert.equal(sig.parameters.length, 2, 'param count');
            assert.equal(sig.parameters[0].name, 'nodeName', 'first param name');
            assert.equal(sig.parameters[1].name, 'id', 'second param name');

            assert.equal(sig.parameters[0].type, reflector.builtinString, 'first param type');
            assert.equal(sig.parameters[1].type, reflector.builtinNumber, 'second param type');
        });

        testProp('resourceBundle', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror, reflector.builtinAny, 'prop type');
        });

        testProp('selectedStage', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            if (!reflector.isInterface(typeMirror)) {
                throw new Error('type should be interface');
            }

            assert.equal(typeMirror.name, 'StageInfo', 'type name');

            const foundProps = typeMirror.propertyNames;
            foundProps.sort();

            assert.equal(foundProps.join(', '), 'children, completePercent, id, name, nextSibling, state, title, type', 'Prop names');

            const propTypes = foundProps.map(propName => typeMirror.describeProperty(propName).type);

            let propType = propTypes[0];
            if (!reflector.isArray(propType)) {
                throw new Error('.children should be Array');
            }
            assert.equal(propType.name, 'Array', '.children type name');
            assert.equal(propType.typeArguments.length, 1, '.children should have 1 type arg');
            const arrayType = propType.typeArguments[0];
            assert.equal(arrayType.name, 'StageInfo', '.children type arg name');

            propType = propTypes[1];
            assert.equal(propType, reflector.builtinNumber, '.completePercent is number');

            propType = propTypes[2];
            assert.equal(propType, reflector.builtinNumber, '.id is number');

            propType = propTypes[3];
            assert.equal(propType, reflector.builtinString, '.name is string');

            propType = propTypes[4];
            assert.equal(propType.name, 'StageInfo', '.nextSibling type name');

            propType = propTypes[5];
            assert.equal(propType.name, 'Result', '.state type name');
            if (!reflector.isEnum(propType)) {
                throw new Error('.state should be enum');
            }
            const enumChildren = propType.members;
            assert.equal(enumChildren.length, 10, 'Result value count');
            assert.equal(enumChildren.map(member => member.name).join(', '),
                'aborted, failure, not_built, paused, queued, running, skipped, success, unknown, unstable',
                'enum child names');
            assert.equal(enumChildren.map(member => member.defaultValue).join(', '),
                '"aborted", "failure", "not_built", "paused", "queued", "running", "skipped", "success", "unknown", "unstable"',
                'enum child values');

            propType = propTypes[6];
            assert.equal(propType, reflector.builtinString, '.title is string');

            propType = propTypes[7];
            assert.equal(propType.name, 'StageType', '.type type name');
            if (!reflector.isTypeAlias(propType)) {
                throw new Error('.type should be alias');
            }
            propType = propType.targetDefinition;
            assert.equal(propType, reflector.builtinString, '.type aliased type should be string');
        });

        testProp('stages', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'Array', 'stages should be Array');
            assert.equal(typeMirror.typeArguments.length, 1, 'stages should be have a type arg');
            const arrayType = typeMirror.typeArguments[0];
            assert.equal(arrayType.name, 'StageInfo', 'stages type arg name');
        });

        testProp('trafficStateChanged', (propMirror: PropertyMirror, typeMirror: TypeMirror) => {
            assert.equal(typeMirror.name, 'Signal', 'trafficStateChanged type name');
            if (!reflector.isExternalTypeReference(typeMirror)) {
                throw new Error('trafficStateChanged should be external ref');
            }

            assert.equal(typeMirror.typeArguments.length, 1, 'trafficStateChanged should have a type arg');
            const typeArg = typeMirror.typeArguments[0];
            if (!reflector.isEnum(typeArg)) {
                throw new Error('trafficStateChanged type arg should be enum');
            }
            assert.equal(typeArg.name, 'TrafficState', 'trafficStateChanged type arg');
        });

    });

    describe('module details', () => {

        let reflector: Reflector;

        beforeAll(() => {
            reflector = typedocReflector(jsonObj);
        })

        function testModule(name: string, tests: { [k: string]: (mirror: ModuleMirror) => void }) {
            describe(name, () => {
                let mirror: ModuleMirror;

                beforeAll(() => {
                    mirror = reflector.describeModule(name);
                });

                test('can get members', () => {
                    const members = mirror.members;
                    assert(members, 'members is not null');

                    let count = 0;
                    count += mirror.classes.length;
                    count += mirror.enums.length;
                    count += mirror.functions.length;
                    count += mirror.interfaces.length;
                    count += mirror.properties.length;
                    count += mirror.namespaces.length;
                    count += mirror.typeAliases.length;
                    count += mirror.objectLiterals.length;

                    if (count !== members.length) {
                        const membersDetails = members.map(member => JSON.stringify({
                            name: member.name,
                            type: member.constructor.name
                        }, null, 4)).join('\n');
                        assert.equal(count, members.length, `individual member accessor totals should sum to members total. Members: ${membersDetails}`);
                    }
                })

                for (const testName of Object.keys(tests)) {
                    test(testName, () => {
                        tests[testName](mirror);
                    });
                }
            });
        }

        testModule('Extensions', {
            'originalName': mirror => {
                assert.equal(mirror.originalName, '/Users/josh/cloudbees/modular-ux-poc/example-widget/src/main/Extensions.ts', 'original name');
            },
            'namespaces': mirror => {

                const mirrorMembers = mirror.members;
                assert(mirrorMembers, 'mirror members');
                assert.equal(mirrorMembers.length, 1, 'mirror members count');

                if (!reflector.isNamespace(mirrorMembers[0])) {
                    throw new Error(`Expected a namespace child, got ${mirrorMembers[0].constructor.name}`);
                }

                const namespaces = mirror.namespaces;
                assert(namespaces, 'namespaces should never be null');
                assert.equal(namespaces.length, 1, 'mirror should have one contained ns');

                const nsMirror = namespaces[0];

                if (!reflector.isNamespace(nsMirror)) {
                    throw new Error(`Expected namespace`);
                }

                assert.equal(nsMirror.name, 'Extensions', 'namespace name');

                const members = nsMirror.members;
                assert(members, 'members list');
                assert.equal(members.length, 1, 'members count');

                if (!reflector.isNamespace(members[0])) {
                    throw new Error(`Expected namespace, got a ${members[0].constructor.name}`);
                }

                const innerNamespaces = nsMirror.namespaces;
                assert.equal(innerNamespaces.length, 1, 'Extensions should have one contained ns');

                const innerNs = innerNamespaces[0];
                assert.equal(innerNs.name, 'Welcome', 'inner namespace name');

                const innerMembers = innerNs.members;
                assert(innerMembers, 'inner members list');
                assert.equal(innerMembers.length, 2, 'inner members count');

                const props = innerNs.properties;
                assert.equal(props.length, 1, 'one prop');
                assert.equal(props[0].name, 'extensionPointId', 'prop name');
                assert.equal(props[0].defaultValue, '"example.widget.greeter"', 'default value');
                assert.equal(props[0].readable, true, 'prop is readable');
                assert.equal(props[0].writeable, false, 'prop is writeable');
                const propType = props[0].type;
                assert(propType, 'can get type');
                assert.equal(propType.name, 'string', 'should be type string');


                const interfaces = innerNs.interfaces;
                assert(interfaces, 'inner module interfaces');
                assert.equal(interfaces.length, 1, 'number of interfaces');
                assert.equal(interfaces[0].name, 'Context', 'interface name');
            }
        });

        testModule('PipelineGraph', {
            'members': mirror => {
                const members = mirror.members;
                assert.equal(members.length, 6, 'all members count');

                members.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });

                let member = members[0];
                assert.equal(member.name, 'PipelineGraph', 'member name');
                assert(reflector.isClass(member), 'member is class');

                member = members[1];
                assert.equal(member.name, 'Props', 'member name');
                assert(reflector.isInterface(member), 'member is interface');

                member = members[2];
                assert.equal(member.name, 'SVGChildren', 'member name');
                if (!reflector.isTypeAlias(member)) {
                    throw new Error(`Expected type alias, got ${member.constructor.name}`);
                }
                assert(reflector.isArray(member.targetDefinition), 'aliased type');

                member = members[3];
                assert.equal(member.name, 'State', 'member name');
                if (!reflector.isInterface(member)) {
                    throw new Error(`Expected interface, got ${member.constructor.name}`);
                }

                member = members[4];
                assert.equal(member.name, 'TrafficState', 'member name');
                if (!reflector.isEnum(member)) {
                    throw new Error(`Expected enum, got ${member.constructor.name}`);
                }

                member = members[5];
                assert.equal(member.name, 'connectorKey', 'member name');
                if (!reflector.isCallable(member)) {
                    throw new Error(`Expected Callable, got ${member.constructor.name}`);
                }
            },
            'classes': mirror => {
                const list = mirror.classes;
                assert(list, 'list exists');
                assert.equal(list.length, 1, 'list count');

                const names = list.map(x => x.name).sort();
                assert.equal(names.join(', '), 'PipelineGraph', 'names');
            },
            'enums': mirror => {
                const list = mirror.enums;
                assert(list, 'list exists');
                assert.equal(list.length, 1, 'list count');

                const names = list.map(x => x.name).sort();
                assert.equal(names.join(', '), 'TrafficState', 'names');
            },
            'typeAliases': mirror => {
                const list = mirror.typeAliases;
                assert(list, 'list exists');
                assert.equal(list.length, 1, 'list count');

                const names = list.map(x => x.name).sort();
                assert.equal(names.join(', '), 'SVGChildren', 'names');
            },
            'functions': mirror => {
                const list = mirror.functions;
                assert(list, 'list exists');
                assert.equal(list.length, 1, 'list count');

                const names = list.map(x => x.name).sort();
                assert.equal(names.join(', '), 'connectorKey', 'names');
            },
        });

        testModule('PipelineGraphLayout', {});

        testModule('PipelineGraphModel', {
            'objectLiterals': mirror => {
                const list = mirror.objectLiterals;
                assert(list, 'list exists');
                assert.equal(list.length, 1, 'list count');

                const names = list.map(x => x.name).sort();
                assert.equal(names.join(', '), 'defaultLayout', 'names');

                const literalMirror = list[0];
                const props = literalMirror.properties;
                assert(props, 'should be able to get props of object literal');
                assert.equal(props.length, 10, 'props count');

                props.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });

                const propNames = props.map(p => p.name).join(', ');
                assert.equal(propNames, 
                    'connectorStrokeWidth, curveRadius, labelOffsetV, nodeRadius, nodeSpacingH, nodeSpacingV, parallelSpacingH, smallLabelOffsetV, terminalRadius, ypStart', 
                    'prop names');

                for (const prop of props) {
                    assert(prop.type, `prop "${prop.name}" should have a type`);
                }
            }
        });
        
        testModule('index', {});
        testModule('support/SVG', {});
        testModule('support/StatusIndicator', {});
        testModule('support/SvgSpinner', {});
        testModule('support/SvgStatus', {});
        testModule('support/TruncatingLabel', {});
        
    });
    
    // TODO: add members to interfacelike
    // TODO: find and test usage of flags.isOptional
    // TODO: find and test usage of flags.isStatic
    // TODO: Reflect on constructor for classes
    // TODO: Reflect on methods for interfacelikes
    // TODO: Walk all the modules, make sure we can construct every def

    // TODO: make a circular type (like a linked list or tree), export that as JSON and make sure we can reflect on it

    // TODO: Repeat for the self-types def, and inspect some interesting cases
    // TODO: When reflecting on self, make sure we can detect which class members are protected / private. Must work for methods and props
});