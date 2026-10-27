//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { type ESTree, type Plugin } from 'vite';

// Mirrors `core/hot-modules.ts`; duplicated because this file runs in node and must not pull in the runtime.
const HOT_KEY_EXPORT = '__dxHotKey';
const HOT_RUNTIME_GLOBAL = '__DX_HOT_MODULES__';

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

/**
 * `lazy` names both `React.lazy(loader)`, whose target is a component (Fast Refresh's), and
 * `Plugin.lazy(meta, loader)`, whose target is a plugin definition (ours); only the latter takes the
 * loader after another argument.
 */
const LAZY_CALLEE = 'lazy';

/** Relative files and package subpath imports (`#plugin`); anything else is a dependency. */
const isLocalSpecifier = (specifier: string): boolean => specifier.startsWith('.') || specifier.startsWith('#');

const calleeName = (callee: ESTree.Expression | ESTree.Super): string | undefined => {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return undefined;
};

/** A `() => import('./x')` loader found in a file: the specifier and the span of its `import(...)`. */
export type ModuleLoader = { specifier: string; start: number; end: number };

const isNode = (value: unknown): value is ESTree.Node =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

/** Every node below `root`, depth first. */
function* walk(root: ESTree.Node): Generator<ESTree.Node> {
  yield root;
  for (const child of Object.values(root)) {
    for (const item of Array.isArray(child) ? child : [child]) {
      if (isNode(item)) {
        yield* walk(item);
      }
    }
  }
}

/**
 * Finds the `() => import('./x')` loaders passed to a call — the shape of `Capability.lazyModule`, every
 * maker built on it, and `Plugin.lazy`. Specifiers with a query are assets.
 */
export const findModuleLoaders = (program: ESTree.Program): ModuleLoader[] => {
  const loaders: ModuleLoader[] = [];
  for (const node of walk(program)) {
    if (node.type !== 'CallExpression') {
      continue;
    }
    const firstLoaderArgument = calleeName(node.callee) === LAZY_CALLEE ? 1 : 0;
    for (const argument of node.arguments.slice(firstLoaderArgument)) {
      if (
        argument.type === 'ArrowFunctionExpression' &&
        argument.params.length === 0 &&
        argument.body.type === 'ImportExpression' &&
        argument.body.source.type === 'Literal' &&
        typeof argument.body.source.value === 'string' &&
        isLocalSpecifier(argument.body.source.value) &&
        !argument.body.source.value.includes('?')
      ) {
        loaders.push({ specifier: argument.body.source.value, start: argument.body.start, end: argument.body.end });
      }
    }
  }
  return loaders.sort((left, right) => left.start - right.start);
};

/**
 * Makes each loader resolve to the newest version of its body. After a hot update the browser keeps
 * serving the original URL's stale instance, so the swap has to happen where the import resolves —
 * innermost, so wrappers around a loader re-run against the new version.
 */
export const rewriteLoaders = (code: string, loaders: readonly ModuleLoader[]): string =>
  [...loaders]
    .sort((a, b) => b.start - a.start)
    .reduce(
      (result, { start, end }) =>
        `${result.slice(0, end)}.then((module) => globalThis.${HOT_RUNTIME_GLOBAL}?.latest(module) ?? module)${result.slice(end)}`,
      code,
    );

/**
 * Makes a file that loads module bodies accept updates of them. Vite otherwise stamps every importer
 * of an updated file, transitively, with a new timestamp, so the next import of this file (a re-created
 * plugin's) would evaluate it again and every module it defines would read as changed. Bodies accept
 * their own updates; one that does not (no module loaded it) lands here and is passed on up.
 */
export const acceptLoaderTargets = (code: string, loaders: readonly ModuleLoader[]): string => {
  const specifiers = [...new Set(loaders.map(({ specifier }) => specifier))];
  if (specifiers.length === 0) {
    return code;
  }
  return (
    `if (import.meta.hot) { import.meta.hot.accept(${JSON.stringify(specifiers)}, () => ` +
    `import.meta.hot.invalidate('module body update not handled')); } ${code}`
  );
};

/**
 * Wraps a module body so it is its own HMR boundary: the new version is handed to the
 * app-framework runtime, which re-runs every plugin module that loaded the file. A file no module
 * has loaded propagates the update instead, so a misidentified body behaves as if untouched.
 *
 * The accept goes first so it registers even when the edited body throws while evaluating;
 * otherwise the next, fixed, save would find no handler and be dropped. It shares the body's first
 * line so the body's line numbers, and so its source map, stay as they were.
 */
export const wrapModuleBody = (code: string, key: string): string => {
  const literal = JSON.stringify(key);
  const accept =
    'if (import.meta.hot) { import.meta.hot.accept((next) => { ' +
    `const runtime = globalThis.${HOT_RUNTIME_GLOBAL}; ` +
    `if (next && runtime?.has(${literal})) { void runtime.update(${literal}, next); } ` +
    `else { import.meta.hot.invalidate('no plugin module loaded ' + ${literal}); } }); } `;
  return `${accept}${code}\nexport const ${HOT_KEY_EXPORT} = ${literal};\n`;
};

/**
 * Dev-server plugin that makes plugin modules hot-replaceable: editing a module body (the file a
 * `Capability.lazyModule` loader imports), or any file only it imports, re-runs that module and
 * its dependents in the running app instead of reloading the page. Editing a plugin's definition
 * (the file `Plugin.lazy` loads), or a file only it imports such as its module specs, re-creates
 * that plugin in place.
 *
 * Bodies that are also React Fast Refresh boundaries are left to Fast Refresh.
 */
export const hotModulesPlugin = (): Plugin => {
  const bodies = new Set<string>();
  let root = process.cwd();

  return {
    name: 'dxos:hot-modules',
    apply: 'serve',
    // After `@vitejs/plugin-react`, so a Fast Refresh footer is visible.
    enforce: 'post',
    configResolved: (config) => {
      root = config.root;
    },
    async transform(code, id) {
      const file = id.split('?')[0];
      if (!SOURCE_FILE.test(file) || file.includes('/node_modules/')) {
        return null;
      }

      // Bodies are always requested after their importer runs, so recording them here comes first.
      let result = code;
      if (code.includes('import(')) {
        const loaders: ModuleLoader[] = [];
        // The plugin context's parser rather than Vite's export: the CLI bundles this barrel with Bun,
        // which cannot follow a value import of Vite.
        for (const loader of findModuleLoaders(this.parse(code))) {
          const resolved = await this.resolve(loader.specifier, file);
          const target = resolved?.id.split('?')[0];
          if (target === undefined || !SOURCE_FILE.test(target) || target.includes('/node_modules/')) {
            continue;
          }
          loaders.push(loader);
          if (!bodies.has(target)) {
            bodies.add(target);
            // Already transformed through another importer: drop the cached result so it is wrapped.
            const graph = this.environment.mode === 'dev' ? this.environment.moduleGraph : undefined;
            graph?.getModulesByFile(target)?.forEach((module) => graph.invalidateModule(module));
          }
        }
        result = acceptLoaderTargets(rewriteLoaders(result, loaders), loaders);
      }

      if (bodies.has(file) && !code.includes('$RefreshReg$')) {
        result = wrapModuleBody(result, `/${path.relative(root, file)}`);
      }
      // Every insertion is on an existing line, so the incoming mappings stay correct line by line.
      return result === code ? null : { code: result, map: null };
    },
  };
};
