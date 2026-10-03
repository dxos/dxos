//
// Copyright 2026 DXOS.org
//

export * as Cell from './Cell.ts';

export * from './decorators.tsx';
export * from './layout.ts';
export * from './ModuleContainer.tsx';
export * from './plugins.ts';
export * from './snapshot.ts';

// NOTE: `./modules` (Logging/Invocations/ExecutionGraph) is a separate `@dxos/storybook-testing/modules`
// entrypoint so importing the core (Cell/ModuleContainer) never eagerly pulls their heavy deps
// (@dxos/devtools, @dxos/compute-runtime, …) into every consumer.
