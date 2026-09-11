//
// Copyright 2026 DXOS.org
//

// Node-only entry: spawns processes and reads the filesystem. Never import it from a browser bundle
// — the browser's half of this package is `@dxos/plugin-computer/shell`.

export * from './computer-shell-plugin.ts';
// Exported for hosts that are not a vite dev server (a storybook server, a test) and mount the
// middleware themselves.
export * as ShellMiddleware from './shell-middleware.ts';
