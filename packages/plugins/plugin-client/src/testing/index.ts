//
// Copyright 2025 DXOS.org
//

// Re-export via `#plugin` so the environment-correct variant is used
// (e.g. `ClientPlugin.node.ts` in node, `ClientPlugin.ts` in browser).
export * from '#plugin';
export { initializeIdentity } from './initializeIdentity';
