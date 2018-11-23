import { Result, defaultLayout, NodeInfo, StageInfo, LabelInfo, CompositeConnection, NodeColumn, StageType } from '../main/PipelineGraphModel';
import { layoutGraph } from '../main/PipelineGraphLayout';
import * as assert from 'assert';

const stagesNullChildren = require('./stages-with-null-children.json');

let __id = 1111;

function makeNode(name: string, children: Array<StageInfo> = [], state = Result.not_built, type: StageType = 'STAGE', completePercent?: number): StageInfo {
    completePercent = completePercent || (state == Result.running ? Math.floor(Math.random() * 60 + 20) : 50);
    const id = __id++;
    const title = name;
    return { name, children, state, completePercent, id, type, title };
}

function makeSequence(...stages: Array<StageInfo>) {
    for (let i = 0; i < stages.length - 1; i++) {
        stages[i].nextSibling = stages[i + 1];
        stages[i].isSequential = true;
    }

    //also mark the last node in the sequence as sequential
    stages[stages.length - 1].isSequential = true;

    return stages[0]; // The model only needs the first in a sequence
}

// Assertion helpers
function assertNode(node: any, text: string, x: number, y: number) {
    assert.ok(node, `node ${text} exists`);
    assert.equal(node.name, text, `node ${text} name`);
    assert.equal(node.x, x, `node ${text} x`);
    assert.equal(node.y, y, `node ${text} y`);
}

type RowType = Array<NodeInfo>; // TODO: Can probably export this from model?

function assertSingleNodeRow(row: RowType, text: string, x: number, y: number) {
    // assert.ok(row, `row for ${text} exists`);
    // assert.equal(row.length, 1, `row for ${text} is single node`);
    // assertNode(row[0], text, x, y);
    assertRow(row, [text, x, y]);
}

function assertRow(row: RowType, ...nodesParams: Array<[string, number, number]>) {
    assert.ok(row, `row exists`);
    assert.equal(row.length, nodesParams.length, `row has ${nodesParams.length} nodes`);
    for (let i = 0; i < nodesParams.length; i++) {
        const node = row[i];
        const [text, x, y] = nodesParams[i];
        assertNode(node, text, x, y);
    }
}

function assertLabel(labels: Array<LabelInfo>, text: string, x: number, y: number) {
    const label = labels.find(label => label.text === text);

    if (!label) {
        throw new Error(`label ${text} should exist`);
    }
    assert.equal(label.x, x, `label ${text} x`);
    assert.equal(label.y, y, `label ${text} y`);
}

function assertConnection(connections: Array<CompositeConnection>, sourceName: string, destinationName: string) {
    for (const compositeConnection of connections) {
        const sourceMatch = compositeConnection.sourceNodes.find(node => node.name === sourceName);
        const destinationMatch = compositeConnection.destinationNodes.find(node => node.name === destinationName);

        if (sourceMatch && destinationMatch) {
            return; // Connection found
        }
    }

    assert.fail(0, 1, `could not find ${sourceName} --> ${destinationName} connection`);
}

describe('PipelineGraph', () => {
    describe('layoutGraph', () => {
        it('gracefully handles a Stage with null children', () => {
            const { nodeColumns } = layoutGraph(stagesNullChildren, defaultLayout);
            assert.ok(nodeColumns);
            assert.equal(nodeColumns.length, 7);
        });

        it('lays out a mixed graph', () => {
            const stages = [
                makeNode('Build', [], Result.success),
                makeNode('Test', [
                    makeNode('JUnit', [], Result.success, 'PARALLEL'),
                    makeNode('DBUnit', [], Result.success, 'PARALLEL'),
                    makeNode('Jasmine', [], Result.success, 'PARALLEL'),
                ]),
                makeNode('Browser Tests', [
                    makeNode('Firefox', [], Result.success, 'PARALLEL'),
                    makeNode('Edge', [], Result.failure, 'PARALLEL'),
                    makeNode('Safari', [], Result.running, 'PARALLEL', 60),
                    makeNode('Chrome', [], Result.running, 'PARALLEL', 120),
                ]),
                makeNode('Skizzled', [], Result.skipped),
                makeNode('Foshizzle', [], Result.skipped),
                makeNode(
                    'Dev',
                    [
                        makeNode('US-East', [], Result.success, 'PARALLEL'),
                        makeNode('US-West', [], Result.success, 'PARALLEL'),
                        makeNode('APAC', [], Result.success, 'PARALLEL'),
                    ],
                    Result.success
                ),
                makeNode('Staging', [], Result.skipped),
                makeNode('Production'),
            ];

            const { nodeColumns, connections, bigLabels, smallLabels, measuredWidth, measuredHeight } = layoutGraph(stages, defaultLayout);

            // Basic stuff

            assert.equal(nodeColumns.length, 10, 'column count');
            assert.equal(measuredWidth, 1128, 'measuredWidth');
            assert.equal(measuredHeight, 320, 'measuredHeight');
            assert.equal(smallLabels.length, 10, 'small label count');
            assert.equal(bigLabels.length, 10, 'big label count');

            // Start col
            let col: NodeColumn = nodeColumns[0];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Start', 60, 55);

            // End col
            col = nodeColumns[9];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'End', 1068, 55);

            // Col 1
            col = nodeColumns[1];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Build', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Build', 144, 55);

            // Col 2
            col = nodeColumns[2];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Test', 'top stage name');
            assert.equal(3, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'JUnit', 264, 55);
            assertSingleNodeRow(col.rows[1], 'DBUnit', 264, 125);
            assertSingleNodeRow(col.rows[2], 'Jasmine', 264, 195);

            // Col 3
            col = nodeColumns[3];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Browser Tests', 'top stage name');
            assert.equal(4, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Firefox', 384, 55);
            assertSingleNodeRow(col.rows[1], 'Edge', 384, 125);
            assertSingleNodeRow(col.rows[2], 'Safari', 384, 195);
            assertSingleNodeRow(col.rows[3], 'Chrome', 384, 265);

            // Col 4
            col = nodeColumns[4];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Skizzled', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Skizzled', 504, 55);

            // Col 5
            col = nodeColumns[5];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Foshizzle', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Foshizzle', 624, 55);

            // Col 6
            col = nodeColumns[6];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Dev', 'top stage name');
            assert.equal(3, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'US-East', 744, 55);
            assertSingleNodeRow(col.rows[1], 'US-West', 744, 125);
            assertSingleNodeRow(col.rows[2], 'APAC', 744, 195);

            // Col 7
            col = nodeColumns[7];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Staging', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Staging', 864, 55);

            // Col 8
            col = nodeColumns[8];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Production', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Production', 984, 55);

            // Big Labels
            assertLabel(bigLabels, 'Start', 60, 55);
            assertLabel(bigLabels, 'Build', 144, 55);
            assertLabel(bigLabels, 'Test', 264, 55);
            assertLabel(bigLabels, 'Browser Tests', 384, 55);
            assertLabel(bigLabels, 'Skizzled', 504, 55);
            assertLabel(bigLabels, 'Foshizzle', 624, 55);
            assertLabel(bigLabels, 'Dev', 744, 55);
            assertLabel(bigLabels, 'Staging', 864, 55);
            assertLabel(bigLabels, 'Production', 984, 55);
            assertLabel(bigLabels, 'End', 1068, 55);

            // Small Labels - Test
            assertLabel(smallLabels, 'JUnit', 264, 55);
            assertLabel(smallLabels, 'DBUnit', 264, 125);
            assertLabel(smallLabels, 'Jasmine', 264, 195);

            // Small Labels - Browser Tests
            assertLabel(smallLabels, 'Firefox', 384, 55);
            assertLabel(smallLabels, 'Edge', 384, 125);
            assertLabel(smallLabels, 'Safari', 384, 195);
            assertLabel(smallLabels, 'Chrome', 384, 265);

            // Small Labels - Dev
            assertLabel(smallLabels, 'US-East', 744, 55);
            assertLabel(smallLabels, 'US-West', 744, 125);
            assertLabel(smallLabels, 'APAC', 744, 195);

            // Connections
            assertConnection(connections, 'Start', 'Build');

            assertConnection(connections, 'Build', 'JUnit');
            assertConnection(connections, 'Build', 'DBUnit');
            assertConnection(connections, 'Build', 'Jasmine');

            assertConnection(connections, 'JUnit', 'Firefox');
            assertConnection(connections, 'JUnit', 'Edge');
            assertConnection(connections, 'JUnit', 'Safari');
            assertConnection(connections, 'JUnit', 'Chrome');
            assertConnection(connections, 'DBUnit', 'Firefox');
            assertConnection(connections, 'DBUnit', 'Edge');
            assertConnection(connections, 'DBUnit', 'Safari');
            assertConnection(connections, 'DBUnit', 'Chrome');
            assertConnection(connections, 'Jasmine', 'Firefox');
            assertConnection(connections, 'Jasmine', 'Edge');
            assertConnection(connections, 'Jasmine', 'Safari');
            assertConnection(connections, 'Jasmine', 'Chrome');

            assertConnection(connections, 'Firefox', 'US-East');
            assertConnection(connections, 'Firefox', 'US-West');
            assertConnection(connections, 'Firefox', 'APAC');
            assertConnection(connections, 'Edge', 'US-East');
            assertConnection(connections, 'Edge', 'US-West');
            assertConnection(connections, 'Edge', 'APAC');
            assertConnection(connections, 'Safari', 'US-East');
            assertConnection(connections, 'Safari', 'US-West');
            assertConnection(connections, 'Safari', 'APAC');
            assertConnection(connections, 'Chrome', 'US-East');
            assertConnection(connections, 'Chrome', 'US-West');
            assertConnection(connections, 'Chrome', 'APAC');

            assertConnection(connections, 'US-East', 'Production');
            assertConnection(connections, 'US-West', 'Production');
            assertConnection(connections, 'APAC', 'Production');

            assertConnection(connections, 'Production', 'End');

            assert.equal(connections.length, 6, 'Total composite connections');
        });

        it('lays out a multi-stage parallel graph', () => {
            const stages = [
                makeNode('Alpha'),
                makeNode('Bravo', [
                    makeNode('Echo', [], Result.not_built, 'PARALLEL'),
                    makeSequence(
                        makeNode('Foxtrot', [], Result.not_built, 'STAGE'),
                        makeNode('Golf', [], Result.not_built, 'STAGE'),
                        makeNode('Hotel', [], Result.not_built, 'STAGE')
                    ),
                    makeSequence(makeNode('India', [], Result.not_built, 'STAGE'), makeNode('Juliet', [], Result.not_built, 'STAGE')),
                ]),
                makeNode('Charlie'),
            ];

            const { nodeColumns, connections, bigLabels, smallLabels, measuredWidth, measuredHeight } = layoutGraph(stages, defaultLayout);

            // Basic stuff

            assert.equal(nodeColumns.length, 5, 'column count');
            assert.equal(measuredWidth, 768, 'measuredWidth');
            assert.equal(measuredHeight, 250, 'measuredHeight');
            assert.equal(smallLabels.length, 6, 'small label count');
            assert.equal(bigLabels.length, 5, 'big label count');

            // Start col
            let col = nodeColumns[0];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Start', 60, 55);

            // End col
            col = nodeColumns[4];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'End', 708, 55);

            // Col 1
            col = nodeColumns[1];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Alpha', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Alpha', 144, 55);

            // Col 2
            col = nodeColumns[2];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Bravo', 'top stage name');
            assert.equal(3, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Echo', 384, 55);
            assertRow(col.rows[1], ['Foxtrot', 264, 125], ['Golf', 384, 125], ['Hotel', 504, 125]);
            assertRow(col.rows[2], ['India', 324, 195], ['Juliet', 444, 195]);

            // Col 3
            col = nodeColumns[3];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Charlie', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Charlie', 624, 55);

            // Big Labels
            assertLabel(bigLabels, 'Start', 60, 55);
            assertLabel(bigLabels, 'Alpha', 144, 55);
            assertLabel(bigLabels, 'Bravo', 384, 55);
            assertLabel(bigLabels, 'Charlie', 624, 55);
            assertLabel(bigLabels, 'End', 708, 55);

            // Small Labels
            assertLabel(smallLabels, 'Echo', 384, 55);
            assertLabel(smallLabels, 'Foxtrot', 264, 125);
            assertLabel(smallLabels, 'Golf', 384, 125);
            assertLabel(smallLabels, 'Hotel', 504, 125);
            assertLabel(smallLabels, 'India', 324, 195);
            assertLabel(smallLabels, 'Juliet', 444, 195);

            // Connections
            assertConnection(connections, 'Start', 'Alpha');

            assertConnection(connections, 'Alpha', 'Echo');
            assertConnection(connections, 'Alpha', 'Foxtrot');
            assertConnection(connections, 'Alpha', 'India');

            assertConnection(connections, 'Echo', 'Charlie');

            assertConnection(connections, 'Foxtrot', 'Golf');
            assertConnection(connections, 'Golf', 'Hotel');
            assertConnection(connections, 'Hotel', 'Charlie');

            assertConnection(connections, 'India', 'Juliet');
            assertConnection(connections, 'Juliet', 'Charlie');

            assertConnection(connections, 'Charlie', 'End');
        });

        it('lays out a single node parallel graph', () => {
            const stages = [makeNode('Build', [], Result.success), makeNode('Test', [makeNode('JUnit', [], Result.success, 'PARALLEL')]), makeNode('Deploy')];

            const { nodeColumns, connections, bigLabels, smallLabels, measuredWidth, measuredHeight } = layoutGraph(stages, defaultLayout);

            // Basic stuff

            assert.equal(nodeColumns.length, 5, 'column count');
            assert.equal(measuredWidth, 528, 'measuredWidth');
            assert.equal(measuredHeight, 200, 'measuredHeight');
            assert.equal(smallLabels.length, 1, 'small label count');
            assert.equal(bigLabels.length, 5, 'big label count');

            // Start col
            let col = nodeColumns[0];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Start', 60, 55);

            // End col
            col = nodeColumns[4];
            assert.equal(undefined, col.topStage, 'topStage');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'End', 468, 55);

            // Col 1
            col = nodeColumns[1];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Build', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Build', 144, 55);

            // Col 2
            col = nodeColumns[2];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Test', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'JUnit', 264, 55);

            // Col 3
            col = nodeColumns[3];
            assert.ok(col.topStage, 'topStage');
            assert.equal(col.topStage!.name, 'Deploy', 'top stage name');
            assert.equal(1, col.rows.length);
            assertSingleNodeRow(col.rows[0], 'Deploy', 384, 55);

            // Big Labels
            assertLabel(bigLabels, 'Start', 60, 55);
            assertLabel(bigLabels, 'Build', 144, 55);
            assertLabel(bigLabels, 'Test', 264, 55);
            assertLabel(bigLabels, 'Deploy', 384, 55);
            assertLabel(bigLabels, 'End', 468, 55);

            // Small Labels - Test
            assertLabel(smallLabels, 'JUnit', 264, 55);

            // Connections
            assertConnection(connections, 'Start', 'Build');
            assertConnection(connections, 'Build', 'JUnit');
            assertConnection(connections, 'JUnit', 'Deploy');
            assertConnection(connections, 'Deploy', 'End');

            assert.equal(connections.length, 4, 'Total composite connections');
        });
    });
});
