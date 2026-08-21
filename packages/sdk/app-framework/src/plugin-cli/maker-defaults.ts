//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import { createRequire as nodeCreateRequire } from 'node:module';
import * as path from 'node:path';

import { parseFile, ts } from './ts-util';

/**
 * Per-family condition defaults, resolved from the module a barrel imports its makers from.
 *
 * The generator parses barrels rather than executing them, so it reads each maker's default from
 * the maker's own declaration: the `environments` literal it passes to `moduleMaker`, or the one
 * it falls back to as `options?.environments ?? [...]`. There is no second copy to drift.
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

/**
 * Every `environments` literal a maker module declares, keyed by the exported maker's name.
 *
 * Two shapes occur, and both are the maker stating its own default: `moduleMaker(name, tag, {
 * environments: [...] })` for the loader-based families, and `options?.environments ?? [...]`
 * inside the value-based helpers. Taking the right operand of the `??` reads the fallback rather
 * than the caller's override, which is exactly the default being sought.
 */
const readMakerDefaults = (filePath: string): Map<string, readonly string[]> | null => {
  const source = parseFile(filePath);
  if (!source) {
    return null;
  }

  const out = new Map<string, readonly string[]>();
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) {
      continue;
    }
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) {
        continue;
      }
      const found = findEnvironments(decl.initializer);
      if (found) {
        out.set(decl.name.text, found);
      }
    }
  }
  return out.size > 0 ? out : null;
};

/** First `environments:` literal reachable in an expression, unwrapping a `??` fallback. */
const findEnvironments = (node: import('@typescript/typescript6').Node): readonly string[] | null => {
  let found: readonly string[] | null = null;
  const visit = (child: import('@typescript/typescript6').Node): void => {
    if (found) {
      return;
    }
    if (ts.isPropertyAssignment(child) && ts.isIdentifier(child.name) && child.name.text === 'environments') {
      let value: import('@typescript/typescript6').Node = child.initializer;
      if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        value = value.right;
      }
      if (ts.isArrayLiteralExpression(value)) {
        found = value.elements.filter(ts.isStringLiteralLike).map((element) => element.text);
        return;
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return found;
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
      const defaults = file && readMakerDefaults(file);
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
const namespaceImports = (
  source: import('@typescript/typescript6').SourceFile,
): { namespace: string; specifier: string }[] => {
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
