//
// Copyright 2026 DXOS.org
//

//
// Compiling and loading an effect's module (react-ui-canvas ANIMATION.md §6.6). The source is TypeScript, transformed
// once per version with esbuild-wasm (as the script plugin compiles), to CommonJS so loading it needs no module
// loader: the module's `require` resolves the helper modules its host injects and nothing else. The globals a module
// could reach the outside world or the clock through are shadowed; a worker that loads it removes them too.
//

import { type EffectModule } from './types.ts';

export type CompileResult = { code: string; errors?: undefined } | { code?: undefined; errors: string[] };

/** Turns a module's TypeScript source into the CommonJS code `loadEffectModule` runs. */
export type ModuleCompiler = (source: string) => Promise<CompileResult>;

type Esbuild = typeof import('esbuild-wasm');

let esbuild: Promise<Esbuild> | undefined;

/**
 * A compiler on esbuild-wasm. In a browser it needs the URL of `esbuild.wasm` (`import wasmURL from
 * 'esbuild-wasm/esbuild.wasm?url'`); in Node it finds the binary itself. esbuild initializes once per page, so a host
 * that already initialized it (the script plugin) is reused.
 */
export const createEsbuildCompiler = ({ wasmURL }: { wasmURL?: string } = {}): ModuleCompiler => {
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
 * Globals a module's code sees as undefined: the network, storage, other threads, the page, timers and clocks. An
 * effect must be a function of its inputs and its seeded random alone.
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

export type LoadOptions = {
  /** The modules the code may `require`, by specifier: the host's helper library. */
  modules: Readonly<Record<string, unknown>>;
  /** Names the definition helper in the error a module without a default export gets (`defineGenerator`). */
  define?: string;
};

/** Loads compiled module code and checks its default export is an effect. Throws with a reason otherwise. */
export const loadEffectModule = <C, O>(code: string, { modules, define }: LoadOptions): EffectModule<C, O> => {
  const module: { exports: Record<string, unknown> } = { exports: {} };
  const allowed = Object.keys(modules);
  const require = (specifier: string) => {
    if (Object.hasOwn(modules, specifier)) {
      return modules[specifier];
    }
    throw new Error(
      `A module may import only ${allowed.map((name) => `'${name}'`).join(', ') || 'nothing'}, not '${specifier}'.`,
    );
  };
  // Strict mode, so `this` in the module is undefined rather than the global object.
  // oxlint-disable-next-line typescript/no-implied-eval -- loading compiled effect code is this module's purpose.
  const run = new Function('module', 'exports', 'require', 'Math', ...SHADOWED, `'use strict';\n${code}`);
  run(module, module.exports, require, deterministicMath, ...SHADOWED.map(() => undefined));
  const effect: unknown = module.exports.default;
  if (typeof effect !== 'object' || effect === null) {
    throw new Error(
      `The module has no default export; export default ${define ? `${define}({ ... })` : 'an effect definition'}.`,
    );
  }
  const sample: unknown = Reflect.get(effect, 'sample');
  if (typeof sample === 'function') {
    return { sample: (ctx) => Reflect.apply(sample, effect, [ctx]) };
  }
  const init: unknown = Reflect.get(effect, 'init');
  const step: unknown = Reflect.get(effect, 'step');
  const draw: unknown = Reflect.get(effect, 'draw');
  const warmup: unknown = Reflect.get(effect, 'warmup');
  if (typeof init === 'function' && typeof step === 'function' && typeof draw === 'function') {
    return {
      warmup: typeof warmup === 'number' ? warmup : undefined,
      init: (ctx) => Reflect.apply(init, effect, [ctx]),
      step: (state, ctx) => Reflect.apply(step, effect, [state, ctx]),
      draw: (state, ctx) => Reflect.apply(draw, effect, [state, ctx]),
    };
  }
  throw new Error('The default export needs sample(ctx), or init(ctx), step(state, ctx) and draw(state, ctx).');
};
