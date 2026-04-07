//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { IndexHtmlTransformContext, Plugin } from 'vite';

/** Virtual module id resolved to the client runtime (uses the app’s @dxos/log). */
export const VITE_PLUGIN_LOG_RUNTIME_ID = '/@dxos-plugin-log/runtime';

export interface VitePluginLogOptions {
  /**
   * Log file path relative to the Vite config root (or cwd if unset).
   * @default 'app.log'
   */
  logFilename?: string;
}

const PLUGIN_NAME = 'dxos:vite-plugin-log';

/**
 * Dev-only: forwards browser @dxos/log output as NDJSON chunks over the Vite HMR WebSocket,
 * appends them to a local file, and truncates that file when the dev server starts.
 */
export const vitePluginLog = (options: VitePluginLogOptions = {}): Plugin => {
  const logFilename = options.logFilename ?? 'app.log';

  const runtimeAbsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'runtime.js');

  return {
    name: PLUGIN_NAME,
    apply: 'serve',
    enforce: 'pre',

    resolveId(id) {
      if (id === VITE_PLUGIN_LOG_RUNTIME_ID) {
        return runtimeAbsPath;
      }
      return undefined;
    },

    configureServer(server) {
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
  };
};

export default vitePluginLog;

export type { LogMetaTransformOptions, LogMetaTransformSpec } from './rolldown-log-meta-types';
export { rolldownLogMetaPlugin } from './rolldown-log-meta-plugin';
