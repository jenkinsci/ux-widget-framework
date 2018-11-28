import * as React from 'react';
import { PipelineGraph } from '../main/PipelineGraph';
import { Result, StageInfo } from '../main/PipelineGraphModel';

/* NB:
 *
 * We've split the stories up into the impl (this file) and the storybook-specific 'glue' code
 * in order to re-use them for Jest snapshot testing, without needing yet another dependency.
 * 
 * ...
 * 
 * And also because my feeble brain is too weak to come up with a babel-free configuration
 * that allows the StoryShots addon to function alongside the rest of our build setup. -JM
 * 
 */

export function renderFlatPipeline() {
    const m = new MockGraphGenerator();

    const stages = [
        m.basicStage('Success', [], Result.success),
        m.basicStage('Failure', [], Result.failure),
        m.basicStage('Running', [], Result.running),
        m.basicStage('Slow', [], Result.running, 150),
        m.basicStage('Queued', [], Result.queued),
        m.basicStage('Unstable', [], Result.unstable),
        m.basicStage('Aborted', [], Result.aborted),
        m.basicStage('Not Built', [], Result.not_built),
        m.basicStage('Bad data', [], 'this is not my office' as any),
    ];

    // Reduce spacing just to make this graph smaller
    const layout = { nodeSpacingH: 90 };

    return (
        <div>
            <PipelineGraph stages={stages} layout={layout} />
        </div>
    );
}

export function renderWithDuplicateNames() {
    const m = new MockGraphGenerator();

    const stages = [
        m.basicStage('Build'),
        m.basicStage('Test'),
        m.basicStage('Browser Tests', [m.basicStage('Internet Explorer'), m.basicStage('Chrome')]),
        m.basicStage('Test'),
        m.basicStage('Staging'),
        m.basicStage('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderFlatPipelineFat() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Success', [], Result.success),
        m.basicStage('Failure', [], Result.failure),
        m.basicStage('Running', [
            m.basicStage('Job 1', [], Result.running),
            m.basicStage('Job 2', [], Result.running),
            m.basicStage('Job 3', [], Result.running),
        ]),
        m.basicStage('Queued', [
            m.basicStage('Job 4', [], Result.queued),
            m.basicStage('Job 5', [], Result.queued),
            m.basicStage('Job 6', [], Result.queued),
            m.basicStage('Job 7', [], Result.queued),
            m.basicStage('Job 8', [], Result.queued),
        ]),
        m.basicStage('Not Built', [], Result.not_built),
        m.basicStage('Bad data', [], 'this is not my office' as any),
    ];

    const layout = {
        connectorStrokeWidth: 10,
        nodeRadius: 20,
        curveRadius: 10,
    };

    return (
        <div style={{ padding: 10 }}>
            <h1>Same data, different layout</h1>
            <h3>Normal</h3>
            <PipelineGraph stages={stages} />
            <h3>Fat</h3>
            <PipelineGraph stages={stages} layout={layout} />
        </div>
    );
}

export function renderListenersPipeline() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Build', [], Result.success),
        m.basicStage('Test', [], Result.success),
        m.basicStage('Browser Tests', [m.basicStage('Internet Explorer', [], Result.queued), m.basicStage('Chrome', [], Result.queued)]),
        m.basicStage('Dev'),
        m.basicStage('Dev'), // Make sure it works with dupe names
        m.basicStage('Staging'),
        m.basicStage('Production'),
    ];

    function nodeClicked(...values: Array<any>) {
        console.log('Node clicked', values);
    }

    return (
        <div>
            <PipelineGraph stages={stages} onNodeClick={nodeClicked} />
        </div>
    );
}

export function renderParallelPipeline() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Build'),
        m.basicStage('Test'),
        m.basicStage('Browser Tests', [m.basicStage('Internet Explorer'), m.basicStage('Chrome')]),
        m.basicStage('Dev but with long label'),
        m.basicStage('Staging'),
        m.basicStage('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderMultiStageParallel() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Alpha'),
        m.basicStage('Bravo', [
            m.basicStage('Single 1'),
            m.basicStage('Single 2'),
            m.makeSequence('seq0', m.basicStage('Single 3')),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 3'), m.basicStage('Multi 2 of 3'), m.basicStage('Multi 3 of 3')),
            m.makeSequence('seq2', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.makeSequence(
                'longer sequence name',
                m.basicStage('Multi 1 of 4'),
                m.basicStage('Multi 2 of 4'),
                m.basicStage('Multi 3 of 4'),
                m.basicStage('Multi 4 of 4')
            ),
            m.basicStage('Single 4'),
        ]),
        m.basicStage('Charlie'),
        m.basicStage('Delta'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderMultiStageSpacing() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Alpha', [m.basicStage('Homer'), m.basicStage('Marge')]),
        m.basicStage('Blue'),
        m.basicStage('Bravo', [
            m.basicStage('Single 1'),
            m.makeSequence(
                'seq1',
                m.basicStage('xxxxxxxxxxxxxxxxxxxxxxxxxx'),
                m.basicStage('xxxxxxxxxxxxxxxxxxxxxxxxxx'),
                m.basicStage('xxxxxxxxxxxxxxxxxxxxxxxxxx')
            ),
            m.makeSequence('seq2', m.basicStage('Multi 1 of 4'), m.basicStage('Multi 2 of 4'), m.basicStage('Multi 3 of 4'), m.basicStage('Multi 4 of 4')),
        ]),
    ];

    return (
        <div style={{ padding: '2em' }}>
            <h3>120px (normal)</h3>
            <PipelineGraph stages={stages} layout={{ parallelSpacingH: 120 }} />
            <h3>100px</h3>
            <PipelineGraph stages={stages} layout={{ parallelSpacingH: 100 }} />
            <h3>95px</h3>
            <PipelineGraph stages={stages} layout={{ parallelSpacingH: 95 }} />
        </div>
    );
}

export function renderEdgeCases1() {
    const m = new MockGraphGenerator();
    const stages1 = [m.basicStage('Alpha', [], Result.skipped), m.basicStage('Bravo', [], Result.success), m.basicStage('Charlie', [], Result.skipped)];

    const stages2 = [
        m.basicStage('Alpha', [
            m.basicStage('Delta', [], Result.success),
            m.basicStage('Echo', [], Result.success),
            m.basicStage('Foxtrot', [], Result.success),
        ]),
        m.basicStage('Bravo', [], Result.success),
        m.basicStage('Charlie', [
            m.basicStage('Golf', [], Result.success),
            m.basicStage('Hotel', [], Result.success),
            m.basicStage('Indigo', [], Result.success),
        ]),
    ];

    const stages3 = [m.basicStage('Alpha', [], Result.success), m.basicStage('Bravo', [], Result.skipped), m.basicStage('Charlie', [], Result.skipped)];

    const stages4 = [
        m.basicStage('Alpha', [
            m.basicStage('Single 1'),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 3'), m.basicStage('Multi 2 of 3'), m.basicStage('Multi 3 of 3')),
            m.makeSequence('seq2', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
        m.basicStage('Bravo', [], Result.skipped),
        m.basicStage('Charlie', [
            m.basicStage('Single 1'),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
    ];

    const stages5 = [
        m.basicStage('Alpha', [
            m.basicStage('Single 1'),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 3'), m.basicStage('Multi 2 of 3'), m.basicStage('Multi 3 of 3')),
            m.makeSequence('seq2', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
        m.basicStage('Bravo'),
        m.basicStage('Charlie', [
            m.basicStage('Single 1'),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
    ];

    return (
        <div>
            <PipelineGraph stages={stages1} selectedStage={stages1[1]} />
            <PipelineGraph stages={stages2} selectedStage={stages2[1]} />
            <PipelineGraph stages={stages3} selectedStage={stages3[0]} />
            <PipelineGraph stages={stages4} selectedStage={stages4[0].children[1].nextSibling!.nextSibling} />
            <PipelineGraph stages={stages5} selectedStage={stages5[0].children[2]} />
        </div>
    );
}

export function renderMultiParallelPipeline() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Build', [], Result.success),
        m.basicStage('Test', [
            m.basicStage('JUnit', [], Result.success),
            m.basicStage('DBUnit', [], Result.success),
            m.basicStage('Jasmine', [], Result.success),
        ]),
        m.basicStage('Browser Tests', [
            m.basicStage('Firefox', [], Result.success),
            m.basicStage('Edge', [], Result.failure),
            m.basicStage('Safari', [], Result.running, 60),
            m.basicStage('Chrome', [], Result.running, 120),
        ]),
        m.basicStage('Skizzled', [], Result.skipped),
        m.basicStage('Foshizzle', [], Result.skipped),
        m.basicStage(
            'Dev',
            [m.basicStage('US-East', [], Result.success), m.basicStage('US-West', [], Result.success), m.basicStage('APAC', [], Result.success)],
            Result.success
        ),
        m.basicStage('Staging', [], Result.skipped),
        m.basicStage('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} selectedStage={stages[0]} />
        </div>
    );
}

export function renderLongNames() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Build something with a long and descriptive name that takes up a shitload of space', [], Result.success),
        m.basicStage('Test', [
            m.basicStage('JUnit', [], Result.success),
            m.basicStage('DBUnit', [], Result.success),
            m.basicStage('Jasmine', [], Result.success),
        ]),
        m.basicStage('Browser Tests', [
            m.basicStage('Firefox', [], Result.success),
            m.basicStage('Das komputermaschine ist nicht auf mittengraben unt die gerfingerpoken. Watchen das blinkenlights.', [], Result.failure),
            m.basicStage('RubberbabybuggybumpersbetyoudidntknowIwasgoingtodothat', [], Result.running, 60),
            m.basicStage('Chrome', [], Result.running, 120),
        ]),
        m.basicStage('Dev'),
        m.basicStage('Staging'),
        m.basicStage('Production'),
    ];

    const stages2 = [
        m.basicStage('Alpha', [
            m.basicStage('Single 1'),
            m.makeSequence(
                'seq1',
                m.basicStage('RubberbabybuggybumpersbetyoudidntknowIwasgoingtodothat'),
                m.basicStage('.............................................................................................'),
                m.basicStage('Das komputermaschine ist nicht auf mittengraben unt die gerfingerpoken. Watchen das blinkenlights.')
            ),
            m.makeSequence('seq2', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
        m.basicStage('Bravo'),
        m.basicStage('Charlie', [
            m.basicStage('Single 1'),
            m.makeSequence('seq1', m.basicStage('Multi 1 of 2'), m.basicStage('Multi 2 of 2')),
            m.basicStage('Single 2'),
        ]),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} selectedStage={stages[0]} />
            <PipelineGraph stages={stages2} selectedStage={stages2[0]} />
        </div>
    );
}

export function renderParallelPipelineDeep() {
    const m = new MockGraphGenerator();
    const stages = [
        m.basicStage('Build', [], Result.success),
        m.basicStage('Test', [], Result.success),
        m.basicStage('Browser Tests', [
            m.basicStage('Internet Explorer', [], Result.success),
            m.basicStage('Firefox', [], Result.running),
            m.basicStage('Edge', [], Result.failure),
            m.basicStage('Safari', [], Result.running),
            m.basicStage('LOLpera', [], Result.queued),
            m.basicStage('Chrome', [], Result.queued),
        ]),
        m.basicStage('Dev', [], Result.not_built),
        m.basicStage('Staging', [], Result.not_built),
        m.basicStage('Production', [], Result.not_built),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export class MockGraphGenerator {
    __id = 111;

    basicStage(name: string, parallels: Array<StageInfo> = [], state: Result = Result.not_built, completePercent?: number): StageInfo {
        const id = this.__id++;

        if (typeof completePercent !== 'number') {
            completePercent = state == Result.running ? 20 + ((id * 47) % 60) : 50;
        }

        for (const parallel of parallels) {
            if (!parallel.isSequential) {
                parallel.type = 'PARALLEL';
            }
        }

        return { name, children: parallels, state, completePercent, id, type: 'STAGE', title: name };
    }

    makeSequence(name: string, ...stages: Array<StageInfo>): StageInfo {
        for (let i = 0; i < stages.length; i++) {
            if (i + 1 < stages.length) {
                stages[i].nextSibling = stages[i + 1];
            }
            stages[i].isSequential = true;
            stages[i].seqContainerName = name;
        }

        return stages[0]; // The model only needs the first in a sequence
    }
}
