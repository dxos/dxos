//
// Copyright 2026 DXOS.org
//

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { type Plugin } from 'vite';

/** Must match `ROUTE` in `@dxos/plugin-file-system/FileSystem`. */
const ROUTE = '/__dx/fs';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'target']);

/** Bounds a listing so a mistaken root (a home directory) cannot stall the server. */
const MAX_LISTED = 5_000;

const remotes = new Map<string, string | undefined>();

/** The `owner/repo` of a checkout's origin, looked up once per root so polling `/roots` does not spawn git. */
const remoteOf = (dir: string): string | undefined => {
  if (!remotes.has(dir)) {
    remotes.set(dir, readRemote(dir));
  }
  return remotes.get(dir);
};

const readRemote = (dir: string): string | undefined => {
  try {
    const url = execFileSync('git', ['-C', dir, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      timeout: 5_000,
    }).trim();
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

/** Writes and removals are limited to these suffixes, so a page cannot rewrite source code through the dev server. */
const WRITABLE = ['.mdl'];

/** Whether the route may write or remove `file`. */
export const isWritable = (file: string): boolean => WRITABLE.some((suffix) => file.endsWith(suffix));

/** The real path of the nearest existing ancestor, with the missing tail re-appended, so a new file can be checked. */
const realpathOf = (file: string): string => {
  try {
    return realpathSync(file);
  } catch {
    const parent = path.dirname(file);
    return parent === file ? file : path.join(realpathOf(parent), path.basename(file));
  }
};

/**
 * The resolved path when `file` lies inside one of `roots`, else undefined. Symlinks are followed before the check,
 * since a link inside a checkout can point anywhere.
 */
export const withinRoots = (roots: readonly string[], file: string): string | undefined => {
  const resolved = path.resolve(file);
  const real = realpathOf(resolved);
  return roots
    .map((root) => realpathOf(path.resolve(root)))
    .some((root) => real === root || real.startsWith(`${root}${path.sep}`))
    ? resolved
    : undefined;
};

/**
 * Dev-only backend of plugin-file-system's FileSystem service, the browser counterpart of the desktop app's Tauri fs
 * plugin. Reads any file inside an allowed root and writes or removes only `WRITABLE` files. The roots are the
 * workspace this server runs from plus `DX_FS_ROOTS` (colon-separated absolute paths of other checkouts).
 */
export const fileSystemPlugin = (rootDir: string, env = process.env): Plugin => {
  const roots = [rootDir, ...(env.DX_FS_ROOTS?.split(':').filter(Boolean) ?? [])].map((root) => path.resolve(root));
  const within = (file: string): string | undefined => withinRoots(roots, file);

  return {
    name: 'dxos:file-system',
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
              files: existsSync(dir) ? list(dir, url.searchParams.get('suffix') ?? '') : [],
            });
          }

          if (url.pathname === '/file') {
            const file = within(url.searchParams.get('path') ?? '');
            if (!file) {
              return send(res, 403, 'File is outside the allowed roots.');
            }
            if (req.method === 'PUT' || req.method === 'DELETE') {
              if (!isWritable(file)) {
                return send(res, 403, `Only ${WRITABLE.join(', ')} files are written.`);
              }
              if (req.method === 'DELETE') {
                rmSync(file, { force: true });
              } else {
                mkdirSync(path.dirname(file), { recursive: true });
                writeFileSync(file, await readBody(req));
              }
              return send(res, 200, { ok: true });
            }
            return existsSync(file) ? send(res, 200, readFileSync(file, 'utf8')) : send(res, 404, 'Not found.');
          }

          send(res, 404, 'Unknown file-system route.');
        } catch (error) {
          send(res, 500, String(error));
        }
      });
    },
  };
};
