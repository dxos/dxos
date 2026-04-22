//
// Copyright 2026 DXOS.org
//

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { type Plugin as VitePlugin } from 'vite';

const WORKSPACE_MARKER_FILES = ['pnpm-workspace.yaml', 'lerna.json', 'turbo.json', 'rush.json'];

/**
 * Find the monorepo workspace root above `start` by walking up directories
 * looking for a workspace marker file or a `package.json` that declares
 * `workspaces`. Falls back to `start` when no marker is found. Keeps `vite`
 * as a type-only import so this module does not introduce a runtime dep.
 */
const findWorkspaceRoot = (start: string): string => {
  let current = path.resolve(start);
  while (true) {
    for (const marker of WORKSPACE_MARKER_FILES) {
      if (existsSync(path.join(current, marker))) {
        return current;
      }
    }
    const pkgPath = path.join(current, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return current;
        }
      } catch {
        // Ignore malformed package.json and keep walking.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return start;
    }
    current = parent;
  }
};

export type DebugLogPluginOptions = {
  /** Route the middleware is mounted on. Defaults to `/__debug_log`. */
  route?: string;
  /**
   * Absolute path of the log file. Defaults to `<workspaceRoot>/.claude/debug.log`,
   * where `workspaceRoot` is resolved via `searchForWorkspaceRoot(server.config.root)`.
   */
  logPath?: string;
  /** Maximum accepted request body size, in bytes. Defaults to 1 MiB. */
  maxBodyBytes?: number;
};

const DEFAULT_ROUTE = '/__debug_log';
const DEFAULT_MAX_BODY_BYTES = 1 << 20;

/**
 * Dev-only Vite middleware that accepts `POST`/`DELETE` from browser code and
 * appends request bodies to a local file an AI coding agent can read back.
 *
 * Used by the `debug-mode` agent skill (`.agents/skills/debug-mode`): the agent
 * inserts instrumentation like
 *
 * ```ts
 * void fetch('/__debug_log', { method: 'POST', body: `[DEBUG H1] x=${x}` });
 * ```
 *
 * into the code under investigation, the user reproduces the bug, and the agent
 * reads the resulting log file. Third-party plugin code hosted inside Composer
 * runs in Composer's origin, so its same-origin `fetch('/__debug_log')` calls
 * land in Composer's log file.
 *
 * Routes:
 * - `POST   <route>` — append request body (plus trailing newline) to the log.
 * - `DELETE <route>` — truncate the log (for the skill's "clear before each reproduction" rule).
 *
 * Applies only during `vite serve` — the plugin is skipped in production builds.
 */
export const debugLogPlugin = (options?: DebugLogPluginOptions): VitePlugin => {
  const route = options?.route ?? DEFAULT_ROUTE;
  const maxBodyBytes = options?.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;

  return {
    name: 'dxos:debug-log',
    apply: 'serve',
    configureServer(server) {
      const logPath = options?.logPath ?? path.join(findWorkspaceRoot(server.config.root), '.claude', 'debug.log');
      const logDir = path.dirname(logPath);

      server.middlewares.use(route, (req, res) => {
        if (req.method === 'DELETE') {
          try {
            if (existsSync(logPath)) {
              writeFileSync(logPath, '');
            }
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST or DELETE only');
          return;
        }

        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBodyBytes) {
            res.statusCode = 413;
            res.end('Body too large');
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        req.on('end', () => {
          try {
            if (!existsSync(logDir)) {
              mkdirSync(logDir, { recursive: true });
            }
            const body = Buffer.concat(chunks).toString('utf-8');
            const line = body.endsWith('\n') ? body : body + '\n';
            appendFileSync(logPath, line);
            res.statusCode = 204;
            res.end();
          } catch (error) {
            res.statusCode = 500;
            res.end(String(error));
          }
        });
        req.on('error', () => {
          res.statusCode = 400;
          res.end();
        });
      });
    },
  };
};
