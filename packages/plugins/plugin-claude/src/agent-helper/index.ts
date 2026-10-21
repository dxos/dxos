//
// Copyright 2026 DXOS.org
//

// Node-only entry, for a Vite dev server that hosts the coding agents (plugin-dev-shell's): the agent server spawns
// processes and listens on a port. Never import it from a browser bundle; the page reaches it through `HelperClient`.

export * as AgentServer from './server.ts';
export * as AgentSidecar from './sidecar.ts';
export * as AgentSpec from './AgentSpec.ts';
