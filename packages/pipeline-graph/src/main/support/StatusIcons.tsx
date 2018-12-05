import * as React from 'react';
import { Result } from '../PipelineGraphModel';
import { SvgSpinner } from './SvgSpinner';
import { SvgStatus } from './SvgStatus';

export const nodeStrokeWidth = 3.5; // px.

// Returns the correct <g> element for the result / progress percent.
export function getGroupForResult(result: Result, percentage: number, radius: number): React.ReactElement<SvgSpinner> | React.ReactElement<SvgStatus> {
    switch (result) {
        case Result.running:
        case Result.queued:
        case Result.not_built: // TODO: Should not be spinner
        case Result.skipped: // TODO: Should not be spinner
            return <SvgSpinner radius={radius} result={result} percentage={percentage} />;
        case Result.success:
        case Result.failure:
        case Result.paused:
        case Result.unstable:
        case Result.aborted:
        case Result.unknown:
            return <SvgStatus radius={radius} result={result} />;
        default:
            badResult(result);
            return <SvgStatus radius={radius} result={Result.unknown} />;
    }
}

function badResult(x: never) {
    console.error('Unexpected Result value', x);
}
