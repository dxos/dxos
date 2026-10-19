//
// Copyright 2026 DXOS.org
//

//
// Compiling and loading a generator's module (ANIMATION.md §6.6). The source is TypeScript, transformed once per
// version with esbuild-wasm (as the script plugin compiles), to CommonJS so loading it needs no module loader: the
// module's `require` resolves the motion library and nothing else. The globals a generator could reach the outside
// world or the clock through are shadowed; the worker that loads it removes them too (`worker.ts`).
//

import * as motion from './motion.ts';
import { type GeneratorModule, MOTION_MODULE } from './types.ts';

export type CompileResult = { code: string; errors?: undefined } | { code?: undefined; errors: string[] };

/** Turns a generator's TypeScript source into the CommonJS code `loadGenerator` runs. */
export type GeneratorCompiler = (source: string) => Promise<CompileResult>;

type Esbuild = typeof import('esbuild-wasm');

let esbuild: Promise<Esbuild> | undefined;

/**
 * A compiler on esbuild-wasm. In a browser it needs the URL of `esbuild.wasm` (`import wasmURL from
 * 'esbuild-wasm/esbuild.wasm?url'`); in Node it finds the binary itself. esbuild initializes once per page, so a host
 * that already initialized it (the script plugin) is reused.
 */
export const createEsbuildCompiler = ({ wasmURL }: { wasmURL?: string } = {}): GeneratorCompiler => {
  return async (source) => {
    const compiler = await (esbuild ??= import('esbuild-wasm').then(async (module) => {
      try {
        await module.initialize(wasmURL ? { wasmURL } : {});
      } catch (error) {
        // Initialized already, by this page's other user of esbuild.
        if (!(error instanceof Error && /more than once/.test(error.message))) {
          throw error;
        }
      }
      return module;
    }));
    try {
      const result = await compiler.transform(source, { loader: 'ts', format: 'cjs', target: 'es2022' });
      return { code: result.code };
    } catch (error) {
      const errors: unknown = error instanceof Error ? Reflect.get(error, 'errors') : undefined;
      return {
        errors: Array.isArray(errors)
          ? errors.map((entry) => {
              const text: unknown = Reflect.get(entry, 'text');
              const location: unknown = Reflect.get(entry, 'location');
              const line =
                typeof location === 'object' && location !== null ? Reflect.get(location, 'line') : undefined;
              return `${line !== undefined ? `line ${line}: ` : ''}${String(text)}`;
            })
          : [error instanceof Error ? error.message : String(error)],
      };
    }
  };
};

/**
 * Globals a generator's code sees as undefined: the network, storage, other threads, the page, timers and clocks. A
 * generator must be a function of its inputs and its seeded random alone.
 */
const SHADOWED = [
  'globalThis',
  'self',
  'window',
  'document',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'navigator',
  'location',
  'postMessage',
  'Worker',
  'SharedWorker',
  'BroadcastChannel',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'setInterval',
  'requestAnimationFrame',
  'performance',
  'Date',
  'Function',
] as const;

/** `Math` without `random`, which would make a run differ from the next. */
const deterministicMath: Math = Object.freeze(
  Object.assign(
    Object.create(null),
    Object.fromEntries(Object.getOwnPropertyNames(Math).map((name) => [name, Reflect.get(Math, name)])),
    {
      random: () => {
        throw new Error('Math.random is not deterministic; use ctx.random.');
      },
    },
  ),
);

/** Loads compiled generator code and checks its default export is a generator. Throws with a reason otherwise. */
export const loadGenerator = (code: string): GeneratorModule => {
  const module: { exports: Record<string, unknown> } = { exports: {} };
  const require = (specifier: string) => {
    if (specifier === MOTION_MODULE) {
      return motion;
    }
    throw new Error(`A generator may import only '${MOTION_MODULE}', not '${specifier}'.`);
  };
  // Strict mode, so `this` in the module is undefined rather than the global object.
  // oxlint-disable-next-line typescript/no-implied-eval -- loading compiled generator code is this module's purpose.
  const run = new Function('module', 'exports', 'require', 'Math', ...SHADOWED, `'use strict';\n${code}`);
  run(module, module.exports, require, deterministicMath, ...SHADOWED.map(() => undefined));
  const generator: unknown = module.exports.default;
  if (typeof generator !== 'object' || generator === null) {
    throw new Error('The module has no default export; export default defineGenerator({ ... }).');
  }
  const sample: unknown = Reflect.get(generator, 'sample');
  if (typeof sample === 'function') {
    return { sample: (ctx) => Reflect.apply(sample, generator, [ctx]) };
  }
  const init: unknown = Reflect.get(generator, 'init');
  const step: unknown = Reflect.get(generator, 'step');
  const draw: unknown = Reflect.get(generator, 'draw');
  const warmup: unknown = Reflect.get(generator, 'warmup');
  if (typeof init === 'function' && typeof step === 'function' && typeof draw === 'function') {
    return {
      warmup: typeof warmup === 'number' ? warmup : undefined,
      init: (ctx) => Reflect.apply(init, generator, [ctx]),
      step: (state, ctx) => Reflect.apply(step, generator, [state, ctx]),
      draw: (state, ctx) => Reflect.apply(draw, generator, [state, ctx]),
    };
  }
  throw new Error('The default export needs sample(ctx), or init(ctx), step(state, ctx) and draw(state, ctx).');
};
