//
// Copyright 2026 DXOS.org
//

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin } from 'vite';

/** Where the running dev server publishes its session, for an agent that cannot read the env it was started with. */
export const SIDECAR_PATH = 'temp/debug-port.json';

const isTrue = (str?: string) => str === 'true' || str === '1';

/**
 * Session id for a dev server started with the debug-port flag, or `''` when absent.
 *
 * `DX_DEBUG_PORT_SESSION` lets the caller choose the id and skip the handshake; `DX_DEBUG_PORT`
 * alone mints one, which the caller reads back from the sidecar below.
 */
export const resolveDebugPortSession = (env = process.env): string =>
  env.DX_DEBUG_PORT_SESSION || (isTrue(env.DX_DEBUG_PORT) ? randomUUID() : '');

/**
 * Publishes the session to `temp/debug-port.json` and stdout, for a caller that cannot set the env
 * of the process it launched (`.claude/launch.json`) and has no other way to learn the id.
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

      // On `listening`: the port is unknown until the server binds.
      server.httpServer?.once('listening', write) ?? write();

      // Only our own record: a restart overlaps, and an unconditional unlink would delete the
      // incoming server's file.
      const remove = () => {
        try {
          if (JSON.parse(readFileSync(file, 'utf8')).session === session) {
            rmSync(file, { force: true });
          }
        } catch {
          // Already gone, or replaced by a server whose record we must not touch.
        }
      };
      server.httpServer?.once('close', remove);
      process.once('exit', remove);
    },
  };
