import * as React from 'react';
import * as renderer from 'react-test-renderer';

import {
    renderFlatPipeline,
    renderMultiParallelPipeline,
    renderMultiStageParallel,
    renderMultiStageSpacing,
    renderEdgeCases1,
    renderLongNames,
    renderWithDuplicateNames,
    renderFlatPipelineFat,
    renderListenersPipeline,
    renderParallelPipeline,
    renderParallelPipelineDeep,
} from '../stories/PipelineGraphStoriesImpl';

describe('PipelineGraph Renderer Storybook snapshots', () => {
    test('renderFlatPipeline', () => {
        expect(treeForStory(renderFlatPipeline)).toMatchSnapshot();
    });

    test('renderMultiParallelPipeline', () => {
        expect(treeForStory(renderMultiParallelPipeline)).toMatchSnapshot();
    });

    test('renderMultiStageParallel', () => {
        expect(treeForStory(renderMultiStageParallel)).toMatchSnapshot();
    });

    test('renderMultiStageSpacing', () => {
        expect(treeForStory(renderMultiStageSpacing)).toMatchSnapshot();
    });

    test('renderEdgeCases1', () => {
        expect(treeForStory(renderEdgeCases1)).toMatchSnapshot();
    });

    test('renderLongNames', () => {
        expect(treeForStory(renderLongNames)).toMatchSnapshot();
    });

    test('renderWithDuplicateNames', () => {
        expect(treeForStory(renderWithDuplicateNames)).toMatchSnapshot();
    });

    test('renderFlatPipelineFat', () => {
        expect(treeForStory(renderFlatPipelineFat)).toMatchSnapshot();
    });

    test('renderListenersPipeline', () => {
        expect(treeForStory(renderListenersPipeline)).toMatchSnapshot();
    });

    test('renderParallelPipeline', () => {
        expect(treeForStory(renderParallelPipeline)).toMatchSnapshot();
    });

    test('renderParallelPipelineDeep', () => {
        expect(treeForStory(renderParallelPipelineDeep)).toMatchSnapshot();
    });
});

function treeForStory(f: () => React.ReactElement<any>): renderer.ReactTestRendererJSON {
    const rendered = f();
    const tree = renderer.create(rendered).toJSON();
    if (!tree) {
        throw new Error('treeForStory: got nothing back from function ' + f.name);
    }
    return tree;
}
