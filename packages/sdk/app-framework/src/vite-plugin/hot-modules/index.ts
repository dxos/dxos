//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { type ESTree, type Plugin, Visitor, parseSync } from 'vite';

// Mirrors `core/hot-modules.ts`; duplicated because this file runs in node and must not pull in the runtime.
const HOT_KEY_EXPORT = '__dxHotKey';
const HOT_RUNTIME_GLOBAL = '__DX_HOT_MODULES__';

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

/** Callees whose loader argument is a lazy component or plugin, not a module body. */
const EXCLUDED_CALLEES = new Set(['lazy']);

const calleeName = (callee: ESTree.Expression | ESTree.Super): string | undefined => {
  if (callee.type === 'Identifier') {
    return callee.name;
  }
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return callee.property.name;
  }
  return undefined;
};

/**
 * Finds the specifiers of `() => import('./x')` loaders passed to a call — the shape of
 * `Capability.lazyModule` and every maker built on it. Specifiers with a query are assets.
 */
export const findModuleLoaders = (filename: string, code: string): string[] => {
  const { program } = parseSync(filename, code);
  const specifiers: string[] = [];
  new Visitor({
    CallExpression: (node) => {
      const name = calleeName(node.callee);
      if (name !== undefined && EXCLUDED_CALLEES.has(name)) {
        return;
      }
      for (const argument of node.arguments) {
        if (
          argument.type === 'ArrowFunctionExpression' &&
          argument.params.length === 0 &&
          argument.body.type === 'ImportExpression' &&
          argument.body.source.type === 'Literal' &&
          typeof argument.body.source.value === 'string' &&
          argument.body.source.value.startsWith('.') &&
          !argument.body.source.value.includes('?')
        ) {
          specifiers.push(argument.body.source.value);
        }
      }
    },
  }).visit(program);
  return specifiers;
};

/**
 * Wraps a module body so it is its own HMR boundary: the new version is handed to the
 * app-framework runtime, which re-runs every plugin module that loaded the file. A file no module
 * has loaded propagates the update instead, so a misidentified body behaves as if untouched.
 *
 * The accept is prepended so it registers even when the edited body throws while evaluating;
 * otherwise the next, fixed, save would find no handler and be dropped.
 */
export const wrapModuleBody = (code: string, key: string): string => {
  const literal = JSON.stringify(key);
  return [
    'if (import.meta.hot) {',
    '  import.meta.hot.accept((next) => {',
    `    const runtime = globalThis.${HOT_RUNTIME_GLOBAL};`,
    `    if (next && runtime?.has(${literal})) {`,
    `      void runtime.update(${literal}, next);`,
    '    } else {',
    `      import.meta.hot.invalidate('no plugin module loaded ' + ${literal});`,
    '    }',
    '  });',
    '}',
    code,
    `export const ${HOT_KEY_EXPORT} = ${literal};`,
    '',
  ].join('\n');
};

/**
 * Dev-server plugin that makes plugin modules hot-replaceable: editing a module body (the file a
 * `Capability.lazyModule` loader imports), or any file only it imports, re-runs that module and
 * its dependents in the running app instead of reloading the page.
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
      if (code.includes('import(')) {
        for (const specifier of findModuleLoaders(file, code)) {
          const resolved = await this.resolve(specifier, file);
          const target = resolved?.id.split('?')[0];
          if (target === undefined || bodies.has(target) || !SOURCE_FILE.test(target)) {
            continue;
          }
          bodies.add(target);
          // Already transformed through another importer: drop the cached result so it is wrapped.
          const graph = this.environment.mode === 'dev' ? this.environment.moduleGraph : undefined;
          graph?.getModulesByFile(target)?.forEach((module) => graph.invalidateModule(module));
        }
      }

      if (!bodies.has(file) || code.includes('$RefreshReg$')) {
        return null;
      }
      return { code: wrapModuleBody(code, `/${path.relative(root, file)}`), map: null };
    },
  };
};
