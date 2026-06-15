//
// Copyright 2026 DXOS.org
//

// @ts-ignore — @types/babel__core present transitively but not declared by this package.
import * as babel from '@babel/core';
// @ts-ignore — @babel/preset-typescript ships no .d.ts.
import babelPresetTypeScript from '@babel/preset-typescript';
// @ts-ignore — babel-preset-solid ships no .d.ts.
import babelPresetSolid from 'babel-preset-solid';
import { type Plugin } from 'esbuild';
import { readFile } from 'fs/promises';

// SWC's automatic React JSX runtime (driven by `jsxImportSource: 'solid-js'`)
// emits `_jsx(...)` calls + `import { jsx } from 'solid-js/jsx-runtime'`, but
// `solid-js/jsx-runtime` actually resolves to `dist/solid.js` which has no
// `jsx`/`jsxs` exports — Solid JSX has to go through `babel-plugin-jsx-dom-expressions`
// (via `babel-preset-solid`) to compile into reactive primitives, not function
// calls. This plugin replaces SwcTransformPlugin for `.tsx` files in packages
// whose tsconfig sets `jsxImportSource: 'solid-js'`. SWC still handles `.ts`
// (no JSX, much faster).

type LogMetaTransformFn = (code: string, filename: string) => string | null;
let _logMetaTransform: LogMetaTransformFn | null | undefined;
let _didWarnLogMetaLoadFailure = false;

const loadLogMetaTransform = async (): Promise<LogMetaTransformFn | null> => {
  if (_logMetaTransform !== undefined) {
    return _logMetaTransform;
  }
  try {
    const specifier = ['@dxos', 'vite-plugin-log'].join('/');
    const mod = (await import(specifier)) as { transformLogMeta?: LogMetaTransformFn };
    _logMetaTransform = mod.transformLogMeta ?? null;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code !== 'ERR_MODULE_NOT_FOUND' && !_didWarnLogMetaLoadFailure) {
      _didWarnLogMetaLoadFailure = true;
      console.warn('dx-compile: failed to load `@dxos/vite-plugin-log`; continuing without log-meta injection.', err);
    }
    _logMetaTransform = null;
  }
  return _logMetaTransform;
};

export interface BabelSolidTransformPluginOptions {
  isVerbose: boolean;
  /** 'dom' for browser apps, 'ssr' for server, 'universal' for both. Defaults to 'dom'. */
  generate?: 'dom' | 'ssr' | 'universal';
  /** Enable hydration markers (server-side rendering). Defaults to false. */
  hydratable?: boolean;
}

export class BabelSolidTransformPlugin {
  private readonly _cache = new Map<string, Promise<string>>();

  constructor(private readonly _options: BabelSolidTransformPluginOptions) {}

  private async _transform(filename: string): Promise<string> {
    const source = await readFile(filename, 'utf8');

    const begin = performance.now();
    const result = await babel.transformAsync(source, {
      filename,
      babelrc: false,
      configFile: false,
      sourceMaps: 'inline',
      // babel-preset-solid runs `babel-plugin-jsx-dom-expressions` which compiles
      // JSX into Solid's reactive primitives (template/insert/effect calls).
      // @babel/preset-typescript strips TypeScript syntax (types, interfaces,
      // enums, satisfies, etc.). Order matters: presets run last-to-first, so
      // TS strips first, then Solid JSX transform sees plain JSX.
      presets: [
        [
          babelPresetSolid,
          {
            generate: this._options.generate ?? 'dom',
            hydratable: this._options.hydratable ?? false,
          },
        ],
        // `onlyRemoveTypeImports: false` (the default) lets Babel track usages
        // and drop imports that turn out to be type-only (e.g. when a `.tsx`
        // file imports a value+type pair where only the type is used after
        // tree-shaking). Without this, `import { type Foo } from 'bar'` may
        // leave the value-side `import 'bar'` in place even though `Foo` was
        // type-only — causing dx-compile's `bundle-deps` plugin to demand
        // `bar` as a dependency.
        [babelPresetTypeScript, { allowDeclareFields: true }],
      ],
    });

    if (!result?.code) {
      throw new Error(`babel-preset-solid returned no code for ${filename}`);
    }
    let code = result.code;

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
        `transformed (babel-solid) ${source.length.toString().padStart(6)} bytes in ${(end - begin)
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
      name: 'babel-solid-transform',
      setup: ({ onLoad, onEnd }) => {
        let files = 0;
        let time = 0;

        onLoad({ namespace: 'file', filter: /\.tsx$/ }, async (args) => {
          const startTime = Date.now();
          const transformed = await this._transformCached(args.path);
          time += Date.now() - startTime;
          files++;

          return {
            contents: transformed,
            // babel output is plain JS — esbuild's `tsx` loader is fine, the
            // JSX is already compiled away. Use `js` to skip TSX parsing.
            loader: 'js',
          };
        });

        if (this._options.isVerbose) {
          onEnd(() => {
            if (files > 0) {
              console.log(
                `Babel (solid) preprocessing took ${time}ms for ${files} files (${(time / files).toFixed(0)} ms/file).`,
              );
            }
          });
        }
      },
    };
  }
}
