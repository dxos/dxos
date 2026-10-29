//
// Copyright 2026 DXOS.org
//

// Node-only entry: spawns processes and reads the filesystem. Never import it from a browser bundle
// - the browser's half of this package is `@dxos/plugin-dev-shell/shell`.

export * from './dev-shell-vite-plugin.ts';
// Exported for hosts that are not a vite dev server (a storybook server, a test) and mount the
// middleware themselves.
export * as AgentHostMiddleware from './agent-host-middleware.ts';
export * as ShellMiddleware from './shell-middleware.ts';
