//
// Copyright 2026 DXOS.org
//

import type { Plugin } from 'vite';

import { log } from '@dxos/log';

import { Shell } from '#shell';

import * as ShellMiddleware from './shell-middleware';

export type ComputerShellPluginOptions = Omit<ShellMiddleware.MakeOptions, 'root'> & {
  /** Defaults to `$DX_COMPUTER_ROOT`; with neither, the route is not mounted at all. */
  root?: string;
};

/**
 * Mounts the computer harness's shell route in a vite dev server.
 *
 * Inert unless a root is configured, which is the opt-in: adding the plugin to a dev server is not
 * on its own consent to run shell commands from a browser tab, so a developer who has not set
 * `DX_COMPUTER_ROOT` gets a dev server with no such route and tools that report it plainly.
 *
 * `apply: 'serve'` keeps it out of a production build, where there is no server to mount it on.
 */
export const ComputerShellPlugin = ({
  root = process.env[Shell.ROOT_ENV],
  ...options
}: ComputerShellPluginOptions = {}): Plugin => ({
  name: 'dx-computer-shell',
  apply: 'serve',
  configureServer: (server) => {
    if (!root) {
      log.info(`computer shell not mounted; set ${Shell.ROOT_ENV} to enable it`);
      return;
    }

    server.middlewares.use(ShellMiddleware.make({ root, ...options }));
  },
});
