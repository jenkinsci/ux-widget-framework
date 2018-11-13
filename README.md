# Blue Ocean Modular UX Widgets

## Packages

-   **[ux-widget-framework](packages/ux-widget-framework)** - Contains both build-time tools to compile widgets, as well as runtime library code used by widgets themselves.
-   **[pipeline-graph](packages/pipeline-graph)** - The PipelineGraph component used to show the results of a build in graphical form, from Blue Ocean.

## Building

If you don't have a global install of the `lerna` CLI tool, use `npx lerna` instead.

1.  Clone the repo
2.  `cd blueocean-widgets`
3.  `lerna bootstrap`
4.  `lerna run dist`
