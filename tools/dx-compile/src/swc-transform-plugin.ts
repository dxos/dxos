//
// Copyright 2022 DXOS.org
//

import * as Swc from '@swc/core';
import { type Plugin } from 'esbuild';
import { readFile } from 'fs/promises';

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
