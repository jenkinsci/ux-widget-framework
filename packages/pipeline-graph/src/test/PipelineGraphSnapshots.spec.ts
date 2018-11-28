import * as React from 'react';
import * as renderer from 'react-test-renderer';

import * as stories from '../stories/PipelineGraphStoriesImpl';

describe('PipelineGraph Renderer Storybook snapshots', () => {
    for (const name in stories) {
        if (name.indexOf('render') === 0) {
            const f = (stories as any)[name];
            test(name, () => {
                expect(treeForStory(f)).toMatchSnapshot();
            });
        }
    }
});

function treeForStory(f: () => React.ReactElement<any>): renderer.ReactTestRendererJSON {
    const rendered = f();
    const tree = renderer.create(rendered).toJSON();
    if (!tree) {
        throw new Error('treeForStory: got nothing back from function ' + f.name);
    }
    return tree;
}
