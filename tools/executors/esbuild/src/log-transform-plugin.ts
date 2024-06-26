//
// Copyright 2022 DXOS.org
//

import { transform } from '@swc/core';
import { type Plugin } from 'esbuild';
import { readFile } from 'fs/promises';
import { basename } from 'path';

const wasmModule = require.resolve('@dxos/swc-log-plugin');

/**
 * Factory so that plugins can share the transform cache.
 *
 * NOTE: Caches by filename, so watch mode is not supported.
 */
export class LogTransformer {
  private readonly _cache = new Map<string, Promise<string>>();

  constructor(private readonly _options: { isVerbose: boolean }) {}

  private async _transform(filename: string): Promise<string> {
    const source = await readFile(filename, 'utf8');

    const begin = performance.now();
    const output = await transform(source, {
      filename: basename(filename),
      sourceMaps: 'inline',
      minify: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        experimental: {
          plugins: [
            [
              wasmModule,
              {
                filename,
                to_transform: [
                  {
                    name: 'log',
                    package: '@dxos/log',
                    param_index: 2,
                    include_args: false,
                    include_call_site: true,
                    include_scope: true,
                  },
                  {
                    name: 'invariant',
                    package: '@dxos/invariant',
                    param_index: 2,
                    include_args: true,
                    include_call_site: false,
                    include_scope: true,
                  },
                  {
                    name: 'Context',
                    package: '@dxos/context',
                    param_index: 1,
                    include_args: false,
                    include_call_site: false,
                    include_scope: false,
                  },
                ],
              },
            ],
          ],
        },
        target: 'es2022',
      },
    });
    const end = performance.now();

    if (this._options.isVerbose) {
      console.log(
        `transformed ${source.length.toString().padStart(6)} bytes in ${(end - begin)
          .toFixed()
          .padStart(6)}ms: ${filename}`,
      );
    }

    return output.code;
  }

  private async _transformCached(filename: string): Promise<string> {
    if (!this._cache.has(filename)) {
      this._cache.set(filename, this._transform(filename));
    }

    return this._cache.get(filename)!;
  }

  createPlugin(): Plugin {
    return {
      name: 'log-transform',
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
              `Log preprocessing took (in parallel) ${time}ms for ${files} files (${(time / files).toFixed(
                0,
              )} ms/file).`,
            );
          });
        }
      },
    };
  }
}
