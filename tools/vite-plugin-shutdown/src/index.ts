//
// Copyright 2026 DXOS.org
//

import type { Plugin, ViteDevServer } from 'vite';

export type ShutdownPluginOptions = {
  /** Signals to handle. Defaults to SIGINT and SIGTERM. */
  signals?: NodeJS.Signals[];
  /** Exit code on graceful shutdown. */
  exitCode?: number;
  /** Suppress the shutdown log line. */
  silent?: boolean;
};

/**
 * Closes the Vite dev server and exits the process on SIGINT/SIGTERM.
 *
 * Why: launched through `pnpm exec` or `moon run`, Ctrl-C often fails to stop
 * `vite dev` because Vite 8 spawns optimizer workers whose signal handling
 * isn't enough to terminate the parent. This plugin installs an explicit
 * `process.once(signal, ...)` handler that calls `server.close()` and
 * `process.exit(...)`. A second signal force-exits with code 1.
 */
export const ShutdownPlugin = (options: ShutdownPluginOptions = {}): Plugin => {
  const signals: NodeJS.Signals[] = options.signals ?? ['SIGINT', 'SIGTERM'];
  const exitCode = options.exitCode ?? 0;
  const silent = options.silent ?? false;
  let server: ViteDevServer | undefined;
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      // Second signal — bail out hard.
      process.exit(1);
    }
    shuttingDown = true;
    if (!silent) {
      process.stdout.write(`\n[vite-plugin-shutdown] received ${signal}, closing dev server…\n`);
    }
    try {
      await server?.close();
    } catch {
      // Ignore — exit anyway.
    }
    process.exit(exitCode);
  };

  return {
    name: 'dxos:shutdown',
    apply: 'serve',
    configureServer(devServer) {
      server = devServer;
      for (const signal of signals) {
        process.once(signal, () => {
          void shutdown(signal);
        });
      }
    },
  };
};

export default ShutdownPlugin;
