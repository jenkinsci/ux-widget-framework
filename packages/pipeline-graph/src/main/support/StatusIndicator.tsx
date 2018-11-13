import * as React from 'react';
import { Result } from '../PipelineGraphModel';
import { SvgSpinner } from './SvgSpinner';
import { SvgStatus } from './SvgStatus';

// Returns the correct <g> element for the result / progress percent.
export function getGroupForResult(result: Result, percentage: number, radius: number) {
    if (usesSvgSpinner(result)) {
        return <SvgSpinner radius={radius} result={result} percentage={percentage} />;
    } else {
        return <SvgStatus radius={radius} result={result} />;
    }
}

// indicates whether result node should use the Spinner component
function usesSvgSpinner(result: Result) {
    switch (result) {
        case 'running':
        case 'queued':
        case 'not_built':
        case 'skipped':
            return true;
        default:
            return false;
    }
}
