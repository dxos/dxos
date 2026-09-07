//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];

// A module declares itself a namespace with the same directive `import-as-namespace` enforces. It
// is what separates a namespace the barrel owes its consumers from a subpath that is deliberately
// a standalone entrypoint — `@dxos/worker-framework/Client` is heavy on purpose, and hoisting it
// onto the barrel would put it in the graph of everyone who imports the package.
const NAMESPACE_DIRECTIVE = /^\s*\/\/\s*@import-as-namespace\s*$/m;

// Namespace subpaths are PascalCase by convention; lowercase keys (`plugin`, `translations`,
// `testing`) are module entrypoints whose named exports are flat, so they carry no namespace
// contract. `dxos-subpath-imports` splits consumers' imports on the same test.
const isNamespaceName = (name) => /^[A-Z]/.test(name);

// The plugin instance belongs to the `./plugin` subpath: the root entry is types/operations only,
// so importing it must not drag the plugin's component graph in.
const PLUGIN_ENTRYPOINTS = new Set(['./plugin', '#plugin']);

const EXPORT_NAMESPACE = /export\s+(type\s+)?\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*['"]([^'"]+)['"]/g;
const EXPORT_STAR = /export\s+(type\s+)?\*\s+from\s*['"]([^'"]+)['"]/g;

/**
 * Removes comments so a commented-out re-export is not mistaken for a live one. String literals are
 * preserved verbatim, since an import specifier may itself contain `//`.
 */
const stripComments = (code) => {
  let out = '';
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (char === '/' && code[index + 1] === '/') {
      while (index < code.length && code[index] !== '\n') {
        index++;
      }
    } else if (char === '/' && code[index + 1] === '*') {
      index += 2;
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) {
        index++;
      }
      index += 2;
    } else if (char === "'" || char === '"' || char === '`') {
      out += char;
      index++;
      while (index < code.length && code[index] !== char) {
        if (code[index] === '\\' && index + 1 < code.length) {
          out += code[index];
          index++;
        }
        out += code[index];
        index++;
      }
      if (index < code.length) {
        out += code[index];
        index++;
      }
    } else {
      out += char;
      index++;
    }
  }
  return out;
};

/**
 * Resolves a specifier to a file on disk, including the directory-with-index form so a nested
 * barrel resolves the same way the bundler resolves it. A `#` self-reference is resolved through
 * the declaring package's `imports` map — barrels reach their own modules that way, so treating it
 * as unresolvable would both hide the namespaces behind it and read as a foreign package.
 */
const resolveModule = (source, fromFile, pkg) => {
  if (source.startsWith('#')) {
    const entry = pkg?.json?.imports?.[source];
    const inner = typeof entry === 'string' ? entry : entry?.source;
    const spec = typeof inner === 'string' ? inner : (inner?.default ?? inner?.node);
    return typeof spec === 'string' ? path.resolve(pkg.dir, spec) : null;
  }
  if (!source.startsWith('.')) {
    return null;
  }
  const base = path.resolve(path.dirname(fromFile), source);
  for (const ext of MODULE_EXTENSIONS) {
    if (fs.existsSync(base + ext)) {
      return base + ext;
    }
  }
  for (const ext of MODULE_EXTENSIONS) {
    const candidate = path.join(base, 'index' + ext);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
};

/** Whether a module declares itself a namespace, and so owes the barrel a namespace re-export. */
const isNamespaceModule = (file, cache) => {
  if (!cache.has(file)) {
    let declared = false;
    try {
      declared = NAMESPACE_DIRECTIVE.test(fs.readFileSync(file, 'utf8'));
    } catch {}
    cache.set(file, declared);
  }
  return cache.get(file);
};

/**
 * Collects every namespace reachable from the barrel, following bare `export *` into nested
 * barrels so nesting is a structural choice rather than something the contract can see. Each entry
 * records the first-hop specifier it arrived through, which is the only node in the linted file
 * that can carry a report for a namespace declared in another file.
 */
const analyzeBarrel = (entryFile, readFile, pkg) => {
  const ambiguous = new Map();
  const externalStars = [];
  const pluginStars = [];
  const visited = new Set();

  const namespacesOf = (file, rootStar) => {
    if (visited.has(file)) {
      return new Map();
    }
    visited.add(file);

    let code;
    try {
      code = stripComments(readFile(file));
    } catch {
      return new Map();
    }

    const own = new Map();
    for (const [, typeKeyword, name, source] of code.matchAll(EXPORT_NAMESPACE)) {
      own.set(name, {
        name,
        source,
        target: resolveModule(source, file, pkg),
        typeOnly: Boolean(typeKeyword),
        declaredIn: file,
        rootStar,
      });
    }

    const viaStar = new Map();
    for (const [, , source] of code.matchAll(EXPORT_STAR)) {
      // The first hop out of the linted file is the one a report can attach to; deeper hops
      // inherit it so a namespace three barrels down still points at a real node.
      const nextRootStar = file === entryFile ? source : rootStar;
      if (PLUGIN_ENTRYPOINTS.has(source)) {
        pluginStars.push({ source, declaredIn: file, rootStar: nextRootStar });
      }
      const resolved = resolveModule(source, file, pkg);
      if (!resolved) {
        if (!source.startsWith('.') && !source.startsWith('#')) {
          externalStars.push({ source, declaredIn: file, rootStar: nextRootStar });
        }
        continue;
      }
      for (const [name, entry] of namespacesOf(resolved, nextRootStar)) {
        viaStar.set(name, [...(viaStar.get(name) ?? []), entry]);
      }
    }

    const result = new Map(own);
    for (const [name, entries] of viaStar) {
      // An explicit re-export shadows a star-provided one, matching ES resolution.
      if (own.has(name)) {
        continue;
      }
      // Two star paths providing the same name resolve to distinct bindings, so ES drops the name
      // from the barrel silently — no compile error anywhere, the namespace simply disappears.
      if (new Set(entries.map((entry) => entry.target)).size > 1) {
        ambiguous.set(name, entries);
        continue;
      }
      result.set(name, entries[0]);
    }
    return result;
  };

  return { namespaces: namespacesOf(entryFile, null), ambiguous, externalStars, pluginStars };
};

/** Reads the package.json governing a file, with its directory. */
const findPackage = (fromFile, cache) => {
  let dir = path.dirname(fromFile);
  while (dir !== path.dirname(dir)) {
    if (cache.has(dir)) {
      return cache.get(dir);
    }
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest)) {
      let result = null;
      try {
        result = { dir, json: JSON.parse(fs.readFileSync(manifest, 'utf8')) };
      } catch {}
      cache.set(dir, result);
      return result;
    }
    dir = path.dirname(dir);
  }
  return null;
};

/**
 * The in-repo TypeScript an exports entry resolves to. Usually the `source` condition, but a
 * `dist-runtime` package has none (the toolbox strips it, since consumers must use the built
 * output), so recover it from `types` the way the toolbox does — without this the rule silently
 * skips every such package, and its barrel could drift from the subpaths consumers are rewritten to.
 */
const sourceOf = (entry, pkgDir) => {
  if (typeof entry === 'string') {
    return entry;
  }
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  if (typeof entry.source === 'string') {
    return entry.source;
  }
  if (typeof entry.types !== 'string') {
    return null;
  }
  const base = entry.types.replace('./dist/types/src', './src').replace(/\.d\.ts$/, '');
  const ext = pkgDir ? ['.ts', '.tsx'].find((candidate) => fs.existsSync(path.join(pkgDir, base + candidate))) : '.ts';
  return ext ? base + ext : null;
};

/**
 * ESLint rule validating a package's root barrel against its exports map: a subpath onto a
 * namespace module must be re-exported from the barrel under the same name, every namespace the
 * barrel exports must have a subpath of its own, and the two must name the same module.
 *
 * `dxos-subpath-imports` rewrites a consumer's `import { Drawing } from '@dxos/plugin-illustrator'`
 * into `import * as Drawing from '@dxos/plugin-illustrator/Drawing'` purely from the exports map,
 * so the rewrite is sound only while the two agree. Nothing else checks them together: that rule
 * lints consumers and never opens the barrel, `import-as-namespace` lints one statement at a time
 * and never opens package.json, and `pkg-lint` never parses TypeScript.
 *
 * Bare `export *` is followed into nested barrels, so `export * from './types'` with the
 * namespaces one level down satisfies the same contract as declaring them all at the root.
 *
 * Applies to any package that already declares at least one PascalCase subpath — a package with
 * none has not migrated yet, and flagging its namespaces would report the migration itself.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'validate a package barrel against the per-namespace subpaths in its exports map',
    },
    fixable: 'code',
    schema: [],
    messages: {
      missingNamespaceExport:
        'Subpath "{{key}}" is declared in the exports map but no namespace "{{name}}" is exported from this barrel. Add: export * as {{name}} from \'{{specifier}}\';',
      namespaceTargetMismatch:
        'Namespace "{{name}}" resolves to {{actual}} but subpath "{{key}}" points at {{expected}}. A consumer rewritten to the subpath would get a different module.',
      typeOnlyNamespaceExport:
        'Namespace "{{name}}" is re-exported as a type, but subpath "{{key}}" declares a value entrypoint.',
      undeclaredNamespace:
        'Namespace "{{name}}" is exported from this barrel but has no "./{{name}}" entry in the exports map, so consumers cannot import it without pulling in the whole package. Add the exports map entry (source: "{{source}}") and the matching vite entry.',
      ambiguousNamespace:
        'Namespace "{{name}}" reaches this barrel through more than one re-export path ({{paths}}), so ES drops it from the barrel entirely.',
      externalStarExport:
        'Barrel re-exports all of "{{source}}". Only package-internal modules may be star-exported; a foreign API cannot be given a subpath of its own.',
      pluginInstanceExported:
        'Barrel re-exports the plugin entrypoint "{{source}}". The root entry carries types and operations only; consumers load the plugin from the "./plugin" subpath.',
      nestedPathExport:
        'Namespace "{{name}}" reaches into "{{source}}". Declare it in "{{barrel}}" and re-export that directory from here with `export * from \'./{{dir}}\';`.',
    },
  },
  create: (context) => {
    const filename = context.filename ?? context.getFilename();
    const packageCache = new Map();
    const directiveCache = new Map();
    const fileCache = new Map();
    // The linted file is read from the buffer rather than disk, so an unsaved edit is analysed as
    // written; only the nested barrels it reaches come off disk.
    const readFile = (file) => {
      if (path.resolve(file) === path.resolve(filename)) {
        return (context.sourceCode ?? context.getSourceCode()).text;
      }
      if (!fileCache.has(file)) {
        fileCache.set(file, fs.readFileSync(file, 'utf8'));
      }
      return fileCache.get(file);
    };

    return {
      Program: (node) => {
        const pkg = findPackage(filename, packageCache);
        const exportsMap = pkg?.json?.exports;
        if (!exportsMap || typeof exportsMap !== 'object') {
          return;
        }

        // Only the package's own root barrel carries this contract.
        const rootSource = sourceOf(exportsMap['.'], pkg.dir);
        if (!rootSource || path.resolve(pkg.dir, rootSource) !== path.resolve(filename)) {
          return;
        }

        const declared = new Map();
        for (const [key, entry] of Object.entries(exportsMap)) {
          const name = key.startsWith('./') ? key.slice(2) : null;
          if (!name || !isNamespaceName(name) || name.includes('/')) {
            continue;
          }
          const source = sourceOf(entry, pkg.dir);
          declared.set(name, { key, target: source ? path.resolve(pkg.dir, source) : null });
        }
        // A package with no per-namespace subpaths has not opted in; its barrel is still the
        // whole API and reporting its namespaces would flag the un-migrated state itself.
        if (declared.size === 0) {
          return;
        }

        const { namespaces, ambiguous, externalStars, pluginStars } = analyzeBarrel(
          path.resolve(filename),
          readFile,
          pkg,
        );

        // Index the linted file's own statements so a finding can point at a real node. A
        // namespace declared in a nested barrel attaches to the `export *` that reaches it.
        const namespaceNodes = new Map();
        const starNodes = new Map();
        for (const statement of node.body) {
          if (statement.type === 'ExportAllDeclaration') {
            if (statement.exported) {
              namespaceNodes.set(statement.exported.name, statement);
            } else {
              starNodes.set(String(statement.source.value), statement);
            }
          }
        }
        const nodeFor = (entry) => namespaceNodes.get(entry.name) ?? starNodes.get(entry.rootStar) ?? node;

        const relativeSpecifier = (target) => {
          const rel = path.relative(path.dirname(path.resolve(filename)), target).replace(/\\/g, '/');
          // A directory module is spelled by its directory, the way the rest of the repo imports it.
          return (
            './' +
            rel
              .replace(/\.\w+$/, '')
              .replace(/\/index$/, '')
              .replace(/^\.\//, '')
          );
        };

        // Insert a missing namespace among its sorted siblings, falling back to the end of the
        // barrel when there are none to sort against.
        const insertNamespace = (fixer, name, specifier) => {
          const text = `export * as ${name} from '${specifier}';`;
          const siblings = [...namespaceNodes.entries()];
          const after = siblings.filter(([sibling]) => sibling < name).at(-1);
          const before = siblings.find(([sibling]) => sibling > name);
          if (before) {
            return fixer.insertTextBefore(before[1], text + '\n');
          }
          if (after) {
            return fixer.insertTextAfter(after[1], '\n' + text);
          }
          const last = node.body.at(-1);
          return last ? fixer.insertTextAfter(last, '\n' + text) : null;
        };

        // A namespace whose binding is already wrong is not also reported for its name, which
        // would be two findings about one edit.
        const reported = new Set();

        for (const [name, { key, target }] of declared) {
          const entry = namespaces.get(name);
          if (!entry) {
            if (ambiguous.has(name)) {
              continue; // Reported below with the paths that collide.
            }
            // Only a namespace module owes the barrel a re-export; a subpath onto an ordinary
            // module is a standalone entrypoint, and hoisting it would enlarge the barrel.
            if (!target || !isNamespaceModule(target, directiveCache)) {
              continue;
            }
            context.report({
              node,
              messageId: 'missingNamespaceExport',
              data: { key, name, specifier: target ? relativeSpecifier(target) : `./${name}` },
              fix: target ? (fixer) => insertNamespace(fixer, name, relativeSpecifier(target)) : undefined,
            });
            continue;
          }
          if (target && entry.target && entry.target !== target) {
            reported.add(name);
            context.report({
              node: nodeFor(entry),
              messageId: 'namespaceTargetMismatch',
              data: {
                name,
                key,
                actual: path.relative(pkg.dir, entry.target),
                expected: path.relative(pkg.dir, target),
              },
            });
            continue;
          }
          if (entry.typeOnly) {
            reported.add(name);
            context.report({ node: nodeFor(entry), messageId: 'typeOnlyNamespaceExport', data: { name, key } });
          }
        }

        for (const [name, entry] of namespaces) {
          if (!isNamespaceName(name) || reported.has(name)) {
            continue;
          }
          if (!declared.has(name)) {
            context.report({
              node: nodeFor(entry),
              messageId: 'undeclaredNamespace',
              data: {
                name,
                source: entry.target ? './' + path.relative(pkg.dir, entry.target).replace(/\\/g, '/') : '?',
              },
            });
          }
        }

        // Anything the barrel reaches a directory down keeps it growing a line per module.
        // Declaring it in that directory's own barrel and star-exporting the directory says the
        // same thing in one line, and the walk above resolves either form identically. A group of
        // names cherry-picked out of a module is the same smell: the module wanted to be a
        // namespace, so give it one rather than a star that would export more than was named.
        for (const statement of node.body) {
          const isNamespace = statement.type === 'ExportAllDeclaration' && statement.exported;
          const isNamed = statement.type === 'ExportNamedDeclaration' && statement.source;
          if (!isNamespace && !isNamed) {
            continue;
          }
          const source = String(statement.source.value);
          if (!source.startsWith('.')) {
            continue;
          }
          const segments = source.replace(/^\.\//, '').split('/');
          if (segments.length < 2) {
            continue;
          }
          const dir = segments[0];
          context.report({
            node: statement,
            messageId: 'nestedPathExport',
            data: {
              name: isNamespace ? statement.exported.name : segments.at(-1),
              source,
              dir,
              barrel: `src/${dir}/index.ts`,
            },
          });
        }

        for (const [name, entries] of ambiguous) {
          context.report({
            node: starNodes.get(entries[0].rootStar) ?? node,
            messageId: 'ambiguousNamespace',
            data: { name, paths: entries.map((entry) => path.relative(pkg.dir, entry.declaredIn)).join(', ') },
          });
        }

        for (const star of externalStars) {
          context.report({
            node: starNodes.get(star.rootStar) ?? node,
            messageId: 'externalStarExport',
            data: { source: star.source },
          });
        }

        for (const star of pluginStars) {
          context.report({
            node: starNodes.get(star.rootStar) ?? node,
            messageId: 'pluginInstanceExported',
            data: { source: star.source },
          });
        }
      },
    };
  },
};
