//
// Copyright 2026 DXOS.org
//

import type { Plugin } from 'vite';

import * as ShellMiddleware from './shell-middleware.ts';

export type ComputerShellPluginOptions = Omit<ShellMiddleware.MakeOptions, 'root'> & {
  /** Defaults to the directory the vite process was started in. */
  root?: string;
};

/**
 * Mounts the computer harness's shell route in a vite dev server and in `vite preview`.
 *
 * The root is the process cwd unless overridden, so `moon run composer-app:serve` from a tree
 * makes that tree the working directory every script starts in.
 *
 * `apply: 'serve'` keeps it out of a production build, where there is no server to mount it on.
 * The preview hook matters because only a bundled app carries the import map that a plugin loaded
 * by URL needs, so a harness that writes a plugin and loads it into the same app runs there.
 */
export const ComputerShellPlugin = ({ root = process.cwd(), ...options }: ComputerShellPluginOptions = {}): Plugin => ({
  name: 'dx-computer-shell',
  apply: 'serve',
  configureServer: (server) => {
    server.middlewares.use(ShellMiddleware.make({ root, ...options }));
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(ShellMiddleware.make({ root, ...options }));
  },
});
