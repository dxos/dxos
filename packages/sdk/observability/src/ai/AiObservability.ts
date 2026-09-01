//
// Copyright 2026 DXOS.org
//

// Standalone entrypoint, not a barrel namespace: Composer's boot imports the root barrel, and
// the boot set is the parse graph, so hoisting the AI sink there would put it on the boot path for
// code only a lazily-activated plugin module uses. Reached at `@dxos/observability/AiObservability`.

export * from './ai-span-processor';
