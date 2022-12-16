//
// Copyright 2022 DXOS.org
//

import { transform } from '@swc/core';
import { Plugin } from 'esbuild';
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

    const output = await transform(source, {
      filename: basename(filename),
      sourceMaps: 'inline',
      minify: false,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true
        },
        experimental: {
          plugins: [[wasmModule, {}]]
        },
        target: 'es2022'
      }
    });

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
            loader: args.path.endsWith('x') ? 'tsx' : 'ts'
          };
        });

        if (this._options.isVerbose) {
          onEnd(() => {
            console.log(
              `Log preprocessing took (in parallel) ${time}ms for ${files} files (${(time / files).toFixed(
                0
              )} ms/file).`
            );
          });
        }
      }
    };
  }
}
