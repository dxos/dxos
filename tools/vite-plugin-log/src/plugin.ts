//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Program } from '@oxc-project/types';
import { Plugin as RolldownPlugin, RolldownMagicString } from 'rolldown';
import type { ConfigEnv, IndexHtmlTransformContext, Plugin, UserConfig } from 'vite';

import {
  DEFAULT_LOG_META_TRANSFORM_SPEC,
  type DxosLogPluginOptions,
  type LogMetaTransformOptions,
} from './definitions.ts';
import { transform } from './transform.ts';

/** Virtual module id resolved to the client runtime (uses the app’s @dxos/log). */
export const VITE_PLUGIN_LOG_RUNTIME_ID = '/@dxos-plugin-log/runtime';

/** Standalone Rolldown meta plugin id (see {@link rolldownLogMetaPlugin}). */
export const ROLLDOWN_LOG_META_PLUGIN_NAME = 'dxos:rolldown-log-meta';

const PLUGIN_NAME = 'dxos:vite-plugin-log';

const LOG_META_EXCLUDE_ID_DEFAULT = /node_modules|\\0/;

/** Inputs matching Rolldown’s `transform` hook `meta` plus `code` / `id`. */
export type RolldownLogMetaHookContext = {
  code: string;
  id: string;
  moduleType: string;
  ast?: Program;
  magicString?: RolldownMagicString;
};

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
  const runtimeAbsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runtime.js');

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
    Object.assign(plugin, {
      resolveId(id: string) {
        if (id === VITE_PLUGIN_LOG_RUNTIME_ID) {
          return runtimeAbsPath;
        }
        return undefined;
      },

      configureServer(server: ViteDevServer) {
        const logPath = path.isAbsolute(logFilename) ? logFilename : path.join(process.cwd(), logFilename);

        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, '', 'utf8');

        server.ws.on('dxos-plugin:log', (data: unknown) => {
          if (data == null || typeof data !== 'object') {
            return;
          }
          const chunk = (data as { chunk?: unknown }).chunk;
          if (typeof chunk !== 'string' || chunk.length === 0) {
            return;
          }
          try {
            fs.appendFileSync(logPath, chunk, 'utf8');
          } catch (err) {
            server.config.logger.error(`[${PLUGIN_NAME}] append failed: ${String(err)}`, { timestamp: true });
          }
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

  if (tr) {
    const metaOptions: LogMetaTransformOptions = {
      to_transform: tr.spec,
      filename: tr.filename,
      excludeId: tr.excludeId,
    };
    plugin.transform = {
      order: 'pre' as const,
      filter: {
        id: {
          exclude: tr.excludeId,
        },
        moduleType: {
          include: ['js', 'jsx', 'ts', 'tsx'],
        },
      },
      handler(code, id, meta) {
        const ms = meta.magicString ?? new RolldownMagicString(code);
        if (!meta?.ast) {
          console.warn('No program', id);
          return null;
        }
        transform(ms, meta.ast, id, { specs: metaOptions.to_transform });
        return { code: ms };
      },
    } satisfies RolldownPlugin['transform'] as any;
  }

  return plugin;
}
