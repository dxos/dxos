//
// Copyright 2026 DXOS.org
//

import type { Program } from '@oxc-project/types';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RolldownMagicString, type Plugin as RolldownPlugin } from 'rolldown';
import { type ConfigEnv, type IndexHtmlTransformContext, type Plugin, type UserConfig, parseSync } from 'vite';

import { VITE_PLUGIN_LOG_SINK_PATH } from './constants.ts';
import {
  DEFAULT_LOG_META_TRANSFORM_SPEC,
  type DxosLogPluginOptions,
  type LogMetaTransformOptions,
} from './definitions.ts';
import { transform } from './transform.ts';

/** Virtual module id resolved to the client runtime (uses the app's @dxos/log). */
export const VITE_PLUGIN_LOG_RUNTIME_ID = '/@dxos-plugin-log/runtime';

/** Standalone Rolldown meta plugin id (see {@link rolldownLogMetaPlugin}). */
export const ROLLDOWN_LOG_META_PLUGIN_NAME = 'dxos:rolldown-log-meta';

const PLUGIN_NAME = 'dxos:vite-plugin-log';

/**
 * Matches Vite's worker entry ids. `?worker_file` is appended to the inner entry of `new Worker(new URL(...))`
 * and `import './w?worker'`; `?sharedworker_file` covers the shared-worker variant.
 */
const WORKER_ENTRY_ID_RE = /[?&](?:worker_file|sharedworker_file)(?:[&=]|$)/;

// The literal `\0` matches the null-byte prefix Rollup/Vite use for virtual module IDs
// (e.g. `\0commonjsHelpers.js`). The lint rule rejects control chars in regexes by default,
// but the null byte is exactly what we want to match here.
// eslint-disable-next-line no-control-regex
const LOG_META_EXCLUDE_ID_DEFAULT = /node_modules|\0/;

/** Inputs matching Rolldown's `transform` hook `meta` plus `code` / `id`. */
export type RolldownLogMetaHookContext = {
  code: string;
  id: string;
  moduleType: string;
  ast?: Program;
  magicString?: RolldownMagicString;
};

/**
 * Standalone transform function for use in custom Rolldown plugins.
 * Returns transformed code or null if no transformation was needed.
 */
export function rolldownLogMetaTransform(
  options: LogMetaTransformOptions,
  ctx: RolldownLogMetaHookContext,
): { code: RolldownMagicString } | null {
  const excludeId = options.excludeId ?? LOG_META_EXCLUDE_ID_DEFAULT;
  if (excludeId instanceof RegExp && excludeId.test(ctx.id)) {
    return null;
  }
  if (!['js', 'jsx', 'ts', 'tsx'].includes(ctx.moduleType)) {
    return null;
  }
  const ms = ctx.magicString ?? new RolldownMagicString(ctx.code);
  if (!ctx.ast) {
    console.warn('No program', ctx.id);
    return null;
  }
  transform(ms, ctx.ast, options.filename ?? ctx.id, { specs: options.to_transform });
  return { code: ms };
}

type ViteDevServer = Awaited<ReturnType<typeof import('vite').createServer>>;

const resolveLogToFile = (options: DxosLogPluginOptions) => {
  if (options.logToFile === false) {
    return undefined;
  }
  return options.logToFile ?? { enabled: true as const };
};

const resolveTransform = (options: DxosLogPluginOptions) => {
  if (options.transform === false) {
    return undefined;
  }
  const tr = options.transform ?? { enabled: true as const };
  return {
    enabled: true as const,
    spec: tr.spec ?? DEFAULT_LOG_META_TRANSFORM_SPEC,
    filename: tr.filename,
    excludeId: tr.excludeId,
  };
};

/**
 * Single Vite/Rolldown plugin: dev log file sink (default on) + Rolldown log-meta transform (default on,
 * same specs as Composer / `DEFAULT_LOG_META_TRANSFORM_SPEC`). Pass `logToFile: false` or `transform: false` to disable.
 */
export function DxosLogPlugin(options: DxosLogPluginOptions = {}): Plugin {
  const log = resolveLogToFile(options);
  const tr = resolveTransform(options);

  const logFilename = log?.filename ?? 'app.log';
  // Prefer the compiled artifact (`dist/.../runtime.js`); fall back to `runtime.ts` so the plugin
  // works when imported directly from `src/` (e.g. by the example app or local dev).
  const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
  const runtimeJsPath = path.join(runtimeDir, 'runtime.js');
  const runtimeAbsPath = fs.existsSync(runtimeJsPath) ? runtimeJsPath : path.join(runtimeDir, 'runtime.ts');

  const plugin: Plugin & RolldownPlugin = {
    name: PLUGIN_NAME,
    enforce: 'pre',
    apply(_config: UserConfig, env: ConfigEnv) {
      if (tr) {
        return true;
      }
      if (log && env.command === 'serve') {
        return true;
      }
      return false;
    },
  };

  if (log?.enabled) {
    const logFilter = log.logFilter ?? 'debug';
    Object.assign(plugin, {
      config() {
        return {
          define: {
            __DXOS_VITE_PLUGIN_LOG_FILTER__: JSON.stringify(logFilter),
          },
        };
      },
      resolveId(id: string) {
        if (id === VITE_PLUGIN_LOG_RUNTIME_ID) {
          return runtimeAbsPath;
        }
        return undefined;
      },

      configureServer(server: ViteDevServer) {
        const logPath = path.isAbsolute(logFilename) ? logFilename : path.join(process.cwd(), logFilename);

        // Best-effort init: bad permissions / read-only volume should warn, not abort the dev server.
        try {
          fs.mkdirSync(path.dirname(logPath), { recursive: true });
          fs.writeFileSync(logPath, '', 'utf8');
        } catch (err) {
          server.config.logger.error(`[${PLUGIN_NAME}] log sink init failed: ${String(err)}`, { timestamp: true });
          return;
        }

        const appendChunk = (chunk: string): void => {
          // Async append so a high-volume sender doesn't block the dev server event loop.
          fs.appendFile(logPath, chunk, 'utf8', (err) => {
            if (err) {
              server.config.logger.error(`[${PLUGIN_NAME}] append failed: ${String(err)}`, { timestamp: true });
            }
          });
        };

        // HTTP sink: page and worker runtimes both POST NDJSON chunks here.
        // Cap accepted payload so a runaway log loop can't OOM the dev server.
        const MAX_SINK_BODY_BYTES = 4 * 1024 * 1024;
        server.middlewares.use(VITE_PLUGIN_LOG_SINK_PATH, (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }
          let body = '';
          let bodyBytes = 0;
          let oversized = false;
          req.setEncoding('utf8');
          req.on('data', (chunk) => {
            if (oversized) {
              return;
            }
            bodyBytes += Buffer.byteLength(chunk, 'utf8');
            if (bodyBytes > MAX_SINK_BODY_BYTES) {
              oversized = true;
              res.statusCode = 413;
              res.end();
              req.destroy();
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (oversized) {
              return;
            }
            if (body.length > 0) {
              appendChunk(body);
            }
            res.statusCode = 204;
            res.end();
          });
          req.on('error', () => {
            if (!res.writableEnded) {
              res.statusCode = 400;
              res.end();
            }
          });
        });
      },

      transformIndexHtml: {
        order: 'pre',
        handler(_html: string, ctx: IndexHtmlTransformContext) {
          if (ctx.server == null) {
            return;
          }
          return [
            {
              tag: 'script',
              attrs: { type: 'module', src: VITE_PLUGIN_LOG_RUNTIME_ID },
              injectTo: 'head-prepend',
            },
          ];
        },
      },
    });
  }

  if (tr || log?.enabled) {
    const metaOptions: LogMetaTransformOptions | undefined = tr
      ? {
          to_transform: tr.spec,
          filename: tr.filename,
          excludeId: tr.excludeId,
        }
      : undefined;
    const excludeId = tr?.excludeId ?? LOG_META_EXCLUDE_ID_DEFAULT;
    let isServe = false;

    Object.assign(plugin, {
      configResolved(resolved: { command: 'serve' | 'build' }) {
        isServe = resolved.command === 'serve';
      },
    });

    plugin.transform = {
      order: 'pre' as const,
      filter: {
        // `excludeId` is intentionally NOT applied at the hook level: worker entries from
        // `node_modules` or virtual modules still need the runtime import. The meta-transform
        // branch re-applies it below to preserve the perf win for non-worker calls.
        moduleType: {
          include: ['js', 'jsx', 'ts', 'tsx'],
        },
      },
      handler(code, id, meta) {
        const isWorkerEntry = WORKER_ENTRY_ID_RE.test(id);
        const doMetaTransform = metaOptions !== undefined && !excludeId.test(id);
        // Worker injection only matters when the dev sink is reachable (serve mode + log enabled).
        const doWorkerInject = isWorkerEntry && isServe && log?.enabled === true;
        if (!doMetaTransform && !doWorkerInject) {
          return null;
        }

        const ms = meta.magicString ?? new RolldownMagicString(code);
        if (doMetaTransform) {
          const program =
            meta.ast ??
            parseSync(id, code, { astType: 'ts', lang: meta.moduleType as 'ts' | 'tsx' | 'js' | 'jsx' | 'dts' })
              .program;
          transform(ms, program, metaOptions!.filename ?? id, { specs: metaOptions!.to_transform });
        }
        if (doWorkerInject) {
          ms.prepend(`import ${JSON.stringify(VITE_PLUGIN_LOG_RUNTIME_ID)};\n`);
        }
        // Return a string + explicit source map (not the `RolldownMagicString` object): under the
        // Vite pipeline the transform result's `code` must be a string, so returning the object leaks
        // downstream as `[object Object]`. The map keeps dev breakpoints / stack traces aligned past
        // the injected preamble `var __dxlog_file=…` line. (Returning the object only works in pure
        // Rolldown / with `experimental.nativeMagicString`.)
        return {
          code: ms.toString(),
          map: ms.generateMap({ hires: true, source: id, includeContent: false }).toString(),
        };
      },
    } satisfies RolldownPlugin['transform'] as any;
  }

  return plugin;
}
