//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { type Plugin } from 'vite';

/** Must match `SPEC_FS_ROUTE` in plugin-code's `#sync`. */
const ROUTE = '/__dx/spec-fs';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'target']);

/** Bounds a listing so a mistaken root (a home directory) cannot stall the server. */
const MAX_LISTED = 5_000;

const remoteOf = (dir: string): string | undefined => {
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
    return url
      .match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
      ?.slice(1, 3)
      .join('/');
  } catch {
    return undefined;
  }
};

const list = (root: string, suffix: string): string[] => {
  const found: string[] = [];
  const walk = (relative: string) => {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      if (found.length >= MAX_LISTED) {
        return;
      }
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith('.') && !SKIP_DIRS.has(entry.name)) {
        walk(child);
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        found.push(child);
      }
    }
  };
  walk('');
  return found;
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  if (typeof body === 'string') {
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end(body);
  } else {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  }
};

/**
 * Dev-only file access for plugin-code's spec sync, the browser counterpart of the desktop app's Tauri fs plugin.
 * Reads any file inside an allowed root (specs, and code a spec links to) and writes only `.mdl` files. The roots are
 * the workspace this server runs from plus `DX_SPEC_ROOTS` (colon-separated absolute paths of other checkouts).
 */
export const specFsPlugin = (rootDir: string, env = process.env): Plugin => {
  const roots = [rootDir, ...(env.DX_SPEC_ROOTS?.split(':').filter(Boolean) ?? [])].map((root) => path.resolve(root));
  const within = (file: string): string | undefined => {
    const resolved = path.resolve(file);
    return roots.some((root) => resolved === root || resolved.startsWith(`${root}${path.sep}`)) ? resolved : undefined;
  };

  return {
    name: 'dxos:spec-fs',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(ROUTE, async (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        try {
          if (url.pathname === '/roots') {
            return send(res, 200, {
              roots: roots.flatMap((root) => {
                const repo = remoteOf(root);
                return repo ? [{ repo, path: root }] : [];
              }),
            });
          }

          if (url.pathname === '/list') {
            const dir = within(url.searchParams.get('dir') ?? '');
            if (!dir) {
              return send(res, 403, 'Directory is outside the allowed roots.');
            }
            return send(res, 200, {
              files: existsSync(dir) ? list(dir, url.searchParams.get('suffix') ?? '.mdl') : [],
            });
          }

          if (url.pathname === '/file') {
            const file = within(url.searchParams.get('path') ?? '');
            if (!file) {
              return send(res, 403, 'File is outside the allowed roots.');
            }
            if (req.method === 'PUT') {
              if (!file.endsWith('.mdl')) {
                return send(res, 403, 'Only .mdl files are written.');
              }
              writeFileSync(file, await readBody(req));
              return send(res, 200, { ok: true });
            }
            return existsSync(file) ? send(res, 200, readFileSync(file, 'utf8')) : send(res, 404, 'Not found.');
          }

          send(res, 404, 'Unknown spec-fs route.');
        } catch (error) {
          send(res, 500, String(error));
        }
      });
    },
  };
};
