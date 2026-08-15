//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import { createRequire as nodeCreateRequire } from 'node:module';
import * as path from 'node:path';

import { parseFile, ts } from './ts-util';

/** The well-known export a maker module publishes to declare its families' conditions. */
const DEFAULTS_EXPORT = 'environmentDefaults';

/**
 * Per-family condition defaults, resolved from the module a barrel imports its makers from.
 *
 * The generator parses barrels rather than executing them, so it cannot see a default that lives
 * inside a maker's body. Instead a maker module exports an `environmentDefaults` object literal
 * mapping maker name to conditions, which this resolves statically — the same literal the makers
 * themselves spread into the specs they build, so the two can never disagree.
 */
export type MakerDefaults = {
  /** Conditions for `<namespace>.<maker>`, or null when the module declares no default for it. */
  lookup: (namespace: string | null, maker: string) => readonly string[] | null;
};

/**
 * Resolves a module specifier to a source file: relative paths directly, bare package subpaths via
 * the package's own `exports` map, preferring the `source` condition (the in-workspace TypeScript)
 * and falling back to `import` (a published package's built JS, which the TS parser also reads).
 */
const resolveModuleFile = (fromDir: string, spec: string): string | null => {
  if (spec.startsWith('.')) {
    const base = path.resolve(fromDir, spec);
    const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  const match = /^(@[^/]+\/[^/]+|[^@][^/]*)(\/.*)?$/.exec(spec);
  if (!match) {
    return null;
  }
  const [, pkgName, subpath = '.'] = match;

  let pkgJsonPath: string;
  try {
    pkgJsonPath = nodeCreateRequire(path.join(fromDir, 'noop.js')).resolve(`${pkgName}/package.json`);
  } catch {
    return null;
  }
  const pkgDir = path.dirname(pkgJsonPath);
  const entry = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))?.exports?.[subpath === '.' ? '.' : `.${subpath}`];
  const target = typeof entry === 'string' ? entry : (entry?.source ?? entry?.import);
  if (typeof target !== 'string') {
    return null;
  }
  const resolved = path.join(pkgDir, target);
  return fs.existsSync(resolved) ? resolved : null;
};

/** Reads an `environmentDefaults` object literal of string-literal arrays, if the module has one. */
const readDefaultsExport = (filePath: string): Map<string, readonly string[]> | null => {
  const source = parseFile(filePath);
  if (!source) {
    return null;
  }
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) {
      continue;
    }
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== DEFAULTS_EXPORT || !decl.initializer) {
        continue;
      }
      // Unwrap `as const satisfies ...` and any other trailing assertions.
      let init: import('typescript').Expression = decl.initializer;
      while (ts.isAsExpression(init) || ts.isSatisfiesExpression(init)) {
        init = init.expression;
      }
      if (!ts.isObjectLiteralExpression(init)) {
        return null;
      }
      const out = new Map<string, readonly string[]>();
      for (const prop of init.properties) {
        if (!ts.isPropertyAssignment(prop) || !ts.isArrayLiteralExpression(prop.initializer)) {
          continue;
        }
        const name = ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name) ? prop.name.text : null;
        if (!name) {
          continue;
        }
        out.set(
          name,
          prop.initializer.elements.filter(ts.isStringLiteralLike).map((element) => element.text),
        );
      }
      return out;
    }
  }
  return null;
};

/**
 * Builds the default lookup for one barrel, from the maker modules it imports. Only namespace
 * imports carry defaults: a maker family is addressed as `<namespace>.<maker>`, which is how the
 * repo imports them (`import * as AppCapability from '@dxos/app-toolkit/AppCapability'`).
 */
export const makerDefaults = (barrelPath: string): MakerDefaults => {
  const source = parseFile(barrelPath);
  const byNamespace = new Map<string, Map<string, readonly string[]>>();
  if (source) {
    const barrelDir = path.dirname(barrelPath);
    for (const { namespace, specifier } of namespaceImports(source)) {
      const file = resolveModuleFile(barrelDir, specifier);
      const defaults = file && readDefaultsExport(file);
      if (defaults) {
        byNamespace.set(namespace, defaults);
      }
    }
  }
  return {
    lookup: (namespace, maker) => (namespace ? (byNamespace.get(namespace)?.get(maker) ?? null) : null),
  };
};

/** Namespace imports (`import * as X from '...'`) with the specifier each binds. */
const namespaceImports = (source: import('typescript').SourceFile): { namespace: string; specifier: string }[] => {
  const out: { namespace: string; specifier: string }[] = [];
  for (const stmt of source.statements) {
    if (
      !ts.isImportDeclaration(stmt) ||
      !stmt.importClause?.namedBindings ||
      !ts.isNamespaceImport(stmt.importClause.namedBindings) ||
      !ts.isStringLiteralLike(stmt.moduleSpecifier)
    ) {
      continue;
    }
    out.push({ namespace: stmt.importClause.namedBindings.name.text, specifier: stmt.moduleSpecifier.text });
  }
  return out;
};
