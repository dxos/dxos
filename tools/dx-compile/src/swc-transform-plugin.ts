//
// Copyright 2022 DXOS.org
//

import * as Swc from '@swc/core';
import { type Plugin } from 'esbuild';
import { readFile } from 'fs/promises';

// Resolved lazily so dx-compile doesn't take a build-time package dep on
// @dxos/vite-plugin-log (which would create a moon cycle:
//   dx-compile:compile -> ^:build -> vite-plugin-log:build -> ts-build's
//   compile -> dx-compile:compile).
type LogMetaTransformFn = (code: string, filename: string) => string | null;
let _logMetaTransform: LogMetaTransformFn | null | undefined;

const loadLogMetaTransform = async (): Promise<LogMetaTransformFn | null> => {
  if (_logMetaTransform !== undefined) {
    return _logMetaTransform;
  }
  try {
    // Specifier built dynamically so TypeScript's bundler resolution doesn't try
    // to type-check the package at dx-compile build time. dx-compile must build
    // standalone (no vite-plugin-log dep on its compile graph) — but at run time
    // the package is always available because every consumer that runs dx-compile
    // already has @dxos/vite-plugin-log resolved (root devDependency).
    const specifier = ['@dxos', 'vite-plugin-log'].join('/');
    const mod = (await import(specifier)) as { transformLogMeta?: LogMetaTransformFn };
    _logMetaTransform = mod.transformLogMeta ?? null;
  } catch {
    // vite-plugin-log not yet built (e.g. self-bootstrap); skip the transform.
    _logMetaTransform = null;
  }
  return _logMetaTransform;
};

/**
 * Factory so that plugins can share the transform cache.
 *
 * NOTE: Caches by filename, so watch mode is not supported.
 */
export class SwcTransformPlugin {
  private readonly _cache = new Map<string, Promise<string>>();

  constructor(
    private readonly _options: {
      isVerbose: boolean;
      getTranspilerOptions: (args: { filePath: string }) => Swc.Options;
    },
  ) {}

  private async _transform(filename: string): Promise<string> {
    const source = await readFile(filename, 'utf8');

    const begin = performance.now();
    const output = await Swc.transform(source, this._options.getTranspilerOptions({ filePath: filename }));
    let code = output.code;

    // Apply @dxos/log call-site meta injection so consumers' dist/ has the
    // same `__dxlog_file` / `{F,L,S,...}` data that the Rolldown plugin emits
    // at app build time. Resolving lazily means dx-compile remains usable
    // before vite-plugin-log itself has been built.
    const transformLogMeta = await loadLogMetaTransform();
    if (transformLogMeta) {
      const next = transformLogMeta(code, filename);
      if (next != null) {
        code = next;
      }
    }

    const end = performance.now();

    if (this._options.isVerbose) {
      console.log(
        `transformed ${source.length.toString().padStart(6)} bytes in ${(end - begin)
          .toFixed()
          .padStart(6)}ms: ${filename}`,
      );
    }

    return code;
  }

  private async _transformCached(filename: string): Promise<string> {
    if (!this._cache.has(filename)) {
      this._cache.set(filename, this._transform(filename));
    }

    return this._cache.get(filename)!;
  }

  createPlugin(): Plugin {
    return {
      name: 'swc-transform',
      setup: ({ onLoad, onEnd }) => {
        let files = 0;
        let time = 0;

        onLoad({ namespace: 'file', filter: /\.ts(x?)$/ }, async (args) => {
          const startTime = Date.now();

          const transformed = await this._transformCached(args.path);

          time += Date.now() - startTime;
          files++;

          return {
            contents: transformed,
            loader: args.path.endsWith('x') ? 'tsx' : 'ts',
          };
        });

        if (this._options.isVerbose) {
          onEnd(() => {
            console.log(
              `SWC preprocessing took (in parallel) ${time}ms for ${files} files (${(time / files).toFixed(
                0,
              )} ms/file).`,
            );
          });
        }
      },
    };
  }
}
