//
// Copyright 2026 DXOS.org
//

import type { Plugin } from 'vite';

import * as ShellMiddleware from './shell-middleware';

export type ComputerShellPluginOptions = Omit<ShellMiddleware.MakeOptions, 'root'> & {
  /** Defaults to the directory the vite process was started in. */
  root?: string;
};

/**
 * Mounts the computer harness's shell route in a vite dev server.
 *
 * The root is the process cwd unless overridden, so `moon run composer-app:serve` from a tree
 * makes that tree the working directory every script starts in.
 *
 * `apply: 'serve'` keeps it out of a production build, where there is no server to mount it on.
 */
export const ComputerShellPlugin = ({ root = process.cwd(), ...options }: ComputerShellPluginOptions = {}): Plugin => ({
  name: 'dx-computer-shell',
  apply: 'serve',
  configureServer: (server) => {
    server.middlewares.use(ShellMiddleware.make({ root, ...options }));
  },
});
