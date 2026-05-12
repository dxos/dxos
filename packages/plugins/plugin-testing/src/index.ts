//
// Copyright 2023 DXOS.org
//

export * from './core';
export * from './meta';
export * from './types';

// `@dxos/plugin-testing` is a testing-only package, so `StorybookPlugin` is
// exported eagerly from the `.` entrypoint (no `Plugin.lazy` indirection).
// Storybook on webkit + vite-dev cannot reliably resolve the lazy form's
// dynamic `import()` — see `./core.ts` for the underlying chunk-init issue
// — and there is no production code-splitting benefit to recover here.
export * from './StorybookPlugin';
