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
    __id = 111;

    const stages = [
        makeNode('Success', [], Result.success),
        makeNode('Failure', [], Result.failure),
        makeNode('Running', [], Result.running),
        makeNode('Slow', [], Result.running, 150),
        makeNode('Queued', [], Result.queued),
        makeNode('Unstable', [], Result.unstable),
        makeNode('Aborted', [], Result.aborted),
        makeNode('Not Built', [], Result.not_built),
        makeNode('Bad data', [], 'this is not my office' as any),
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
    __id = 111;
    const stages = [
        makeNode('Build'),
        makeNode('Test'),
        makeNode('Browser Tests', [makeNode('Internet Explorer'), makeNode('Chrome')]),
        makeNode('Test'),
        makeNode('Staging'),
        makeNode('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderFlatPipelineFat() {
    __id = 111;
    const stages = [
        makeNode('Success', [], Result.success),
        makeNode('Failure', [], Result.failure),
        makeNode('Running', [makeNode('Job 1', [], Result.running), makeNode('Job 2', [], Result.running), makeNode('Job 3', [], Result.running)]),
        makeNode('Queued', [
            makeNode('Job 4', [], Result.queued),
            makeNode('Job 5', [], Result.queued),
            makeNode('Job 6', [], Result.queued),
            makeNode('Job 7', [], Result.queued),
            makeNode('Job 8', [], Result.queued),
        ]),
        makeNode('Not Built', [], Result.not_built),
        makeNode('Bad data', [], 'this is not my office' as any),
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
    __id = 111;
    const stages = [
        makeNode('Build', [], Result.success),
        makeNode('Test', [], Result.success),
        makeNode('Browser Tests', [makeNode('Internet Explorer', [], Result.queued), makeNode('Chrome', [], Result.queued)]),
        makeNode('Dev'),
        makeNode('Dev'), // Make sure it works with dupe names
        makeNode('Staging'),
        makeNode('Production'),
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
    __id = 111;
    const stages = [
        makeNode('Build'),
        makeNode('Test'),
        makeNode('Browser Tests', [makeNode('Internet Explorer'), makeNode('Chrome')]),
        makeNode('Dev but with long label'),
        makeNode('Staging'),
        makeNode('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderMultiStageParallel() {
    __id = 111;
    const stages = [
        makeNode('Alpha'),
        makeNode('Bravo', [
            makeNode('Single 1'),
            makeNode('Single 2'),
            makeNode('Single 3'),
            makeSequence(makeNode('Multi 1 of 3'), makeNode('Multi 2 of 3'), makeNode('Multi 3 of 3')),
            makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')),
            makeSequence(makeNode('Multi 1 of 4'), makeNode('Multi 2 of 4'), makeNode('Multi 3 of 4'), makeNode('Multi 4 of 4')),
            makeNode('Single 4'),
        ]),
        makeNode('Charlie'),
        makeNode('Delta'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

export function renderMultiStageSpacing() {
    __id = 111;
    const stages = [
        makeNode('Alpha', [makeNode('Homer'), makeNode('Marge')]),
        makeNode('Blue'),
        makeNode('Bravo', [
            makeNode('Single 1'),
            makeSequence(makeNode('xxxxxxxxxxxxxxxxxxxxxxxxxx'), makeNode('xxxxxxxxxxxxxxxxxxxxxxxxxx'), makeNode('xxxxxxxxxxxxxxxxxxxxxxxxxx')),
            makeSequence(makeNode('Multi 1 of 4'), makeNode('Multi 2 of 4'), makeNode('Multi 3 of 4'), makeNode('Multi 4 of 4')),
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
    __id = 111;
    const stages1 = [makeNode('Alpha', [], Result.skipped), makeNode('Bravo', [], Result.success), makeNode('Charlie', [], Result.skipped)];

    const stages2 = [
        makeNode('Alpha', [makeNode('Delta', [], Result.success), makeNode('Echo', [], Result.success), makeNode('Foxtrot', [], Result.success)]),
        makeNode('Bravo', [], Result.success),
        makeNode('Charlie', [makeNode('Golf', [], Result.success), makeNode('Hotel', [], Result.success), makeNode('Indigo', [], Result.success)]),
    ];

    const stages3 = [makeNode('Alpha', [], Result.success), makeNode('Bravo', [], Result.skipped), makeNode('Charlie', [], Result.skipped)];

    const stages4 = [
        makeNode('Alpha', [
            makeNode('Single 1'),
            makeSequence(makeNode('Multi 1 of 3'), makeNode('Multi 2 of 3'), makeNode('Multi 3 of 3')),
            makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')),
            makeNode('Single 2'),
        ]),
        makeNode('Bravo', [], Result.skipped),
        makeNode('Charlie', [makeNode('Single 1'), makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')), makeNode('Single 2')]),
    ];

    const stages5 = [
        makeNode('Alpha', [
            makeNode('Single 1'),
            makeSequence(makeNode('Multi 1 of 3'), makeNode('Multi 2 of 3'), makeNode('Multi 3 of 3')),
            makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')),
            makeNode('Single 2'),
        ]),
        makeNode('Bravo'),
        makeNode('Charlie', [makeNode('Single 1'), makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')), makeNode('Single 2')]),
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
    __id = 111;
    const stages = [
        makeNode('Build', [], Result.success),
        makeNode('Test', [makeNode('JUnit', [], Result.success), makeNode('DBUnit', [], Result.success), makeNode('Jasmine', [], Result.success)]),
        makeNode('Browser Tests', [
            makeNode('Firefox', [], Result.success),
            makeNode('Edge', [], Result.failure),
            makeNode('Safari', [], Result.running, 60),
            makeNode('Chrome', [], Result.running, 120),
        ]),
        makeNode('Skizzled', [], Result.skipped),
        makeNode('Foshizzle', [], Result.skipped),
        makeNode(
            'Dev',
            [makeNode('US-East', [], Result.success), makeNode('US-West', [], Result.success), makeNode('APAC', [], Result.success)],
            Result.success
        ),
        makeNode('Staging', [], Result.skipped),
        makeNode('Production'),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} selectedStage={stages[0]} />
        </div>
    );
}

export function renderLongNames() {
    __id = 111;
    const stages = [
        makeNode('Build something with a long and descriptive name that takes up a shitload of space', [], Result.success),
        makeNode('Test', [makeNode('JUnit', [], Result.success), makeNode('DBUnit', [], Result.success), makeNode('Jasmine', [], Result.success)]),
        makeNode('Browser Tests', [
            makeNode('Firefox', [], Result.success),
            makeNode('Das komputermaschine ist nicht auf mittengraben unt die gerfingerpoken. Watchen das blinkenlights.', [], Result.failure),
            makeNode('RubberbabybuggybumpersbetyoudidntknowIwasgoingtodothat', [], Result.running, 60),
            makeNode('Chrome', [], Result.running, 120),
        ]),
        makeNode('Dev'),
        makeNode('Staging'),
        makeNode('Production'),
    ];

    const stages2 = [
        makeNode('Alpha', [
            makeNode('Single 1'),
            makeSequence(
                makeNode('RubberbabybuggybumpersbetyoudidntknowIwasgoingtodothat'),
                makeNode('.............................................................................................'),
                makeNode('Das komputermaschine ist nicht auf mittengraben unt die gerfingerpoken. Watchen das blinkenlights.')
            ),
            makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')),
            makeNode('Single 2'),
        ]),
        makeNode('Bravo'),
        makeNode('Charlie', [makeNode('Single 1'), makeSequence(makeNode('Multi 1 of 2'), makeNode('Multi 2 of 2')), makeNode('Single 2')]),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} selectedStage={stages[0]} />
            <PipelineGraph stages={stages2} selectedStage={stages2[0]} />
        </div>
    );
}

export function renderParallelPipelineDeep() {
    __id = 111;
    const stages = [
        makeNode('Build', [], Result.success),
        makeNode('Test', [], Result.success),
        makeNode('Browser Tests', [
            makeNode('Internet Explorer', [], Result.success),
            makeNode('Firefox', [], Result.running),
            makeNode('Edge', [], Result.failure),
            makeNode('Safari', [], Result.running),
            makeNode('LOLpera', [], Result.queued),
            makeNode('Chrome', [], Result.queued),
        ]),
        makeNode('Dev', [], Result.not_built),
        makeNode('Staging', [], Result.not_built),
        makeNode('Production', [], Result.not_built),
    ];

    return (
        <div>
            <PipelineGraph stages={stages} />
        </div>
    );
}

let __id = 1;

/// Simple helper for data generation
function makeNode(name: string, children: Array<StageInfo> = [], state: Result = Result.not_built, completePercent?: number): StageInfo {
    const id = __id++;

    if (typeof completePercent !== 'number') {
        completePercent = state == Result.running ? 20 + ((id * 47) % 60) : 50;
    }

    const type = 'STAGE'; // TODO: move this to params if we need it
    return { name, children, state, completePercent, id, type, title: name };
}

function makeSequence(...stages: Array<StageInfo>): StageInfo {
    for (let i = 0; i < stages.length - 1; i++) {
        stages[i].nextSibling = stages[i + 1];
    }

    return stages[0]; // The model only needs the first in a sequence
}
