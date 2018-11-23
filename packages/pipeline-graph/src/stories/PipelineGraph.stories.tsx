import { storiesOf } from "@storybook/react";

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
  renderParallelPipelineDeep
} from "./PipelineGraphStoriesImpl";

import "../styles/main.scss";

/* NB:
 *
 * We've split the stories up into the impl and the storybook-specific 'glue' code (this file)
 * in order to re-use them for Jest snapshot testing, without needing yet another dependency.
 * 
 * This way we can import styles here for use in storybook, without having to set up CSS 
 * loaders in our jest config, which we'd have to do if we just exported the funcs from here.
 *  
 */

storiesOf("PipelineGraph", module)
  .add("Legend", renderFlatPipeline)
  .add("Mixed", renderMultiParallelPipeline)
  .add("Multi-stage Parallel", renderMultiStageParallel)
  .add("Multi-stage Spacing", renderMultiStageSpacing)
  .add("Edge cases 1", renderEdgeCases1)
  .add("Long names", renderLongNames)
  .add("Duplicate Names", renderWithDuplicateNames)
  .add("Fat", renderFlatPipelineFat)
  .add("Listeners", renderListenersPipeline)
  .add("Parallel", renderParallelPipeline)
  .add("Parallel (Deep)", renderParallelPipelineDeep);
