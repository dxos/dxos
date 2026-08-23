//
// Copyright 2026 DXOS.org
//

import { randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin } from 'vite';

/** Where the running dev server publishes its session, for an agent that cannot read the env it was started with. */
export const SIDECAR_PATH = 'temp/debug-port.json';

const isTrue = (str?: string) => str === 'true' || str === '1';

/**
 * Session id for a dev server started with the debug-port flag, or `''` when the flag is absent.
 *
 * `DX_DEBUG_PORT_SESSION` lets the caller choose the id, which removes the handshake entirely: an
 * agent that generated the value already knows what to pass to `composer-recovery.js`. `DX_DEBUG_PORT`
 * alone mints one, for callers with no way to set the env of the process they launch — the sidecar
 * below is how they read it back.
 */
export const resolveDebugPortSession = (env = process.env): string =>
  env.DX_DEBUG_PORT_SESSION || (isTrue(env.DX_DEBUG_PORT) ? randomUUID() : '');

/**
 * Publishes the dev server's debug-port session to `temp/<...>` and to stdout.
 *
 * The file is the back-channel for an agent that launched the server through a fixed command it
 * cannot add env to (`.claude/launch.json`), so it has no other way to learn the id. Removed on
 * close: a session id outliving its server reads as a live port that no longer exists.
 */
export const debugPortSidecarPlugin = (session: string, rootDir: string): Plugin | false =>
  !!session && {
    name: 'dxos-debug-port-sidecar',
    apply: 'serve',
    configureServer(server) {
      const file = path.join(rootDir, SIDECAR_PATH);
      const write = () => {
        const address = server.httpServer?.address();
        const port = typeof address === 'object' && address ? address.port : undefined;
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(
          file,
          JSON.stringify(
            { session, pid: process.pid, port, url: port ? `http://localhost:${port}` : undefined },
            null,
            2,
          ),
        );
        server.config.logger.info(`  ➜  Debug port session: ${session}`);
      };

      // `listening` rather than the hook body: the port is unknown until the server binds, and an
      // agent that reads the file needs the URL to open, not just the id.
      server.httpServer?.once('listening', write) ?? write();
      const remove = () => rmSync(file, { force: true });
      server.httpServer?.once('close', remove);
      process.once('exit', remove);
    },
  };
