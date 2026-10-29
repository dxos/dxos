//
// Copyright 2026 DXOS.org
//

import type { Connect, Plugin } from 'vite';

import * as AgentHostMiddleware from './agent-host-middleware.ts';
import * as ExecRunner from './exec-runner.ts';
import * as ShellMiddleware from './shell-middleware.ts';

export type DevShellVitePluginOptions = Omit<ShellMiddleware.MakeOptions, 'root' | 'runner'> & {
  /** Defaults to the directory the vite process was started in. */
  root?: string;
  /** Where the coding-agent host finds its agents and worktrees; `false` leaves the route out. */
  agentHost?: AgentHostMiddleware.MakeOptions | false;
};

/**
 * Mounts the dev shell's shell route, and the coding-agent host plugin-claude's agents run on, in a vite dev server
 * and in `vite preview`.
 *
 * The root is the process cwd unless overridden, so `moon run composer-app:serve` from a tree
 * makes that tree the working directory every script starts in.
 *
 * `apply: 'serve'` keeps it out of a production build, where there is no server to mount it on.
 * The preview hook matters because only a bundled app carries the import map that a plugin loaded
 * by URL needs, so a harness that writes a plugin and loads it into the same app runs there.
 */
export const DevShellVitePlugin = ({
  root = process.cwd(),
  agentHost = {},
  ...options
}: DevShellVitePluginOptions = {}): Plugin => {
  const host = agentHost === false ? undefined : AgentHostMiddleware.make(agentHost);
  const runner = ExecRunner.make();
  const mount = (server: {
    middlewares: Connect.Server;
    httpServer: { on: (event: 'close', listener: () => void) => unknown } | null;
  }) => {
    server.middlewares.use(ShellMiddleware.make({ root, ...options, runner }));
    // The exec runner and the agent server stop when their input closes, so they go with the dev server.
    server.httpServer?.on('close', () => void runner.close());
    if (host) {
      server.middlewares.use(host.middleware);
      server.httpServer?.on('close', () => void host.close());
    }
  };
  return {
    name: 'dx-dev-shell',
    apply: 'serve',
    // Before the server's watcher opens a descriptor per watched file: past macOS's `OPEN_MAX` it can spawn nothing.
    configResolved: () => {
      runner.prepare();
      host?.prepare();
    },
    configureServer: (server) => mount(server),
    configurePreviewServer: (server) => mount(server),
  };
};
