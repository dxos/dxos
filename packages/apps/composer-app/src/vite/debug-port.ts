//
// Copyright 2026 DXOS.org
//

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin } from 'vite';

/** Where the running dev server publishes its session, for an agent that cannot read the env it was started with. */
export const SIDECAR_PATH = 'temp/debug-port.json';

const isFalse = (str?: string) => str === 'false' || str === '0';

/**
 * Session id for the dev server's debug port, or `''` when opted out with `DX_DEBUG_PORT=false`.
 *
 * On by default because the port is loopback-only and compiled out of builds (see `vite.config.ts`).
 * The opt-out wins over `DX_DEBUG_PORT_SESSION`, which may be left exported in the shell.
 * `DX_DEBUG_PORT_SESSION` lets the caller choose the id and skip the handshake; otherwise one is
 * minted, which the caller reads back from the sidecar below.
 */
export const resolveDebugPortSession = (env = process.env): string =>
  isFalse(env.DX_DEBUG_PORT) ? '' : env.DX_DEBUG_PORT_SESSION || randomUUID();

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
