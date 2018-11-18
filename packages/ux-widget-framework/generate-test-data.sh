set -e
yarn run typedoc --ignoreCompilerErrors --json test/reflector/self-test-types.json ./test/
yarn run typedoc --ignoreCompilerErrors --json test/reflector/self-types.json ./src/