# Shims

This is a staging area for Typescript definitions that are either not available 
from the third-party packages directly or from [Definitely Typed](https://github.com/DefinitelyTyped/DefinitelyTyped).

NOTES:
- The `project.json` must have a `build` section, which has a dummy executor.
- The workspace global `package.json` contains a reference to `@dxos/shims`.
- Each package must declare '@dxos/shims' in its `tsconfig.json` `types` definition.
