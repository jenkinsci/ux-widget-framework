# TODOs

## Immediate

-   [ ] Spike out a joined repo including the framework as a separate lerna package
-   [ ] Make sure we can publish from lerna @ the root
-   [ ] Creat infra ticket for namespaced repo hosting
-   [ ] Once repo is moved, update namespaces and repo urls in package.json files

## Later?

-   [ ] Docgen - requires fw work, and the longer we put this off the more detailed standard for docs will be.

# Done

-   [x] Move over unit tests from BO codebase
-   [x] Fix up gulp dist issue
-   [x] Validate / fix up stylesheet compilation
-   [x] Clean out any styles / SCSS vars not being used by this code
-   [x] Set up Storybook, move stories from BO codebase
-   [x] Make sure the typedefs being generated are correct
-   [x] Validate if we can have Blue Ocean using this when published with es6 modules
-   [x] Set up prettier
-   [x] Make build run from Lerna
-   [x] Publish a framework build from its repo to the jenkins namespace
-   [x] Replace local TGZ framework ref with published framework, make sure it works and builds
-   [x] Ensure this all works in a fresh checkout
