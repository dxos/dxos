//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

const MODULE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.mjs'];

/** Resolves a relative specifier the way the bundler does, including the directory-index form. */
const resolveModule = (source, fromFile) => {
  if (!source.startsWith('.')) {
    return null;
  }
  const base = path.resolve(path.dirname(fromFile), source);
  // The specifier may already carry its extension (`./types/index.ts`) — resolve it directly
  // rather than appending another one on top, which would never exist on disk.
  if (MODULE_EXTENSIONS.some((ext) => base.endsWith(ext))) {
    return fs.existsSync(base) ? base : null;
  }
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
 * Maps every file a package's `imports` aliases resolve to back to its alias. A conditional
 * source contributes one entry per branch, marked as such: `#plugin` resolving to `plugin.node.ts`
 * under node and `plugin.tsx` by default makes the alias a SUPERSET of any one branch, so swapping
 * a relative import for it changes which module loads rather than just how it is spelled.
 */
const aliasTargets = (pkg) => {
  const targets = new Map();
  for (const [alias, entry] of Object.entries(pkg.json.imports ?? {})) {
    const source = typeof entry === 'string' ? entry : entry?.source;
    const branches = typeof source === 'string' ? { default: source } : (source ?? {});
    const conditional = Object.keys(branches).length > 1;
    for (const spec of Object.values(branches)) {
      if (typeof spec === 'string') {
        targets.set(path.resolve(pkg.dir, spec), { alias, conditional });
      }
    }
  }
  return targets;
};

/**
 * ESLint rule requiring a package's own `imports` aliases to be used in place of a relative path
 * that resolves to the same file. An alias nobody imports looks unused when it is in fact being
 * routed around — `#apis` had 29 relative imports reaching the module it names.
 *
 * The mapping is derived per package from its own manifest, so this enforces consistency with what
 * the package already declared rather than imposing a convention: a package that declares no
 * aliases is never reported, and declaring one retroactively makes the codebase adopt it.
 *
 * A relative import landing on one branch of a CONDITIONAL alias is left alone: the alias resolves
 * per condition, so it names a different module rather than the same one spelled differently.
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: "use a package's own import aliases instead of relative paths to the same file",
    },
    fixable: 'code',
    schema: [],
    messages: {
      useAlias: 'Use the "{{alias}}" import alias instead of "{{source}}"; both resolve to {{target}}.',
    },
  },
  create: (context) => {
    const filename = context.filename ?? context.getFilename();
    const packageCache = new Map();
    const pkg = findPackage(filename, packageCache);
    if (!pkg?.json?.imports) {
      return {};
    }
    const targets = aliasTargets(pkg);
    if (targets.size === 0) {
      return {};
    }

    const check = (node) => {
      if (!node.source) {
        return;
      }
      const source = String(node.source.value);
      if (!source.startsWith('.')) {
        return;
      }
      const resolved = resolveModule(source, filename);
      const match = resolved && targets.get(resolved);
      if (!match) {
        return;
      }
      // A file cannot reach itself through its own alias.
      if (path.resolve(resolved) === path.resolve(filename)) {
        return;
      }
      // A module the barrel itself pulls in would import its own importer.
      if (path.basename(resolved).startsWith('index.') && path.dirname(resolved) === path.dirname(filename)) {
        const barrel = fs.readFileSync(resolved, 'utf8');
        const stem = path.basename(filename).replace(/\.\w+$/, '');
        // The barrel's own specifier carries its extension (`./${stem}.ts`) under
        // `rewriteRelativeImportExtensions`, so match with or without one.
        if (new RegExp(`from '\\./${stem}(?:\\.\\w+)?'`).test(barrel)) {
          return;
        }
      }

      // Naming one branch of a conditional alias is not a bypass: the alias resolves per
      // condition, so it and the relative path are different modules. Both readings are in use —
      // a plugin's `testing.ts` may want the full default build (`./plugin`) or the
      // condition-appropriate one (`#plugin`, which under vitest yields the headless node
      // variant) — and picking one for the author would be wrong.
      if (match.conditional) {
        return;
      }

      context.report({
        node: node.source,
        messageId: 'useAlias',
        data: { alias: match.alias, source, target: path.relative(pkg.dir, resolved) },
        fix: (fixer) => fixer.replaceText(node.source, `'${match.alias}'`),
      });
    };

    return {
      ImportDeclaration: check,
      ExportNamedDeclaration: check,
      ExportAllDeclaration: check,
    };
  },
};
