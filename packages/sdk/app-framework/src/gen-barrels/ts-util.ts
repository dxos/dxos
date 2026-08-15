//
// Copyright 2026 DXOS.org
//

// Aliased: dx-compile's node banner injects its own `createRequire` binding into the bundle, so
// the bare name would collide.
import fs from 'node:fs';
import { createRequire as nodeCreateRequire } from 'node:module';
import path from 'node:path';

// The tool operates on the consumer's TypeScript source, so it borrows the consumer's (or the
// workspace's) `typescript` install instead of adding a heavyweight runtime dependency to
// app-framework that every browser consumer would download.
const resolveTypescript = (): typeof import('typescript') => {
  const candidates = [path.join(process.cwd(), 'package.json'), import.meta.url];
  for (const base of candidates) {
    try {
      const require = nodeCreateRequire(base);
      return require('typescript');
    } catch {
      continue;
    }
  }
  throw new Error("dx-gen-barrels requires 'typescript' to be installed in the target package or workspace.");
};

export const ts = resolveTypescript();

type SourceFile = import('typescript').SourceFile;
type Node = import('typescript').Node;
type Statement = import('typescript').Statement;
type Expression = import('typescript').Expression;

/** Parse a file into a ts.SourceFile, or null if it doesn't exist. */
export const parseFile = (filePath: string): SourceFile | null => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
};

/** Full source text of a node, as written (not re-printed). */
export const nodeText = (sourceFile: SourceFile, node: Node): string =>
  sourceFile.text.slice(node.getStart(sourceFile), node.getEnd());

/** Flattened text of a member-access chain, e.g. `AppCapability.schema`. */
export const calleeText = (sourceFile: SourceFile, expr: Expression): string => {
  if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  if (ts.isPropertyAccessExpression(expr)) {
    return `${calleeText(sourceFile, expr.expression)}.${expr.name.text}`;
  }
  return nodeText(sourceFile, expr);
};

/** Statement text including the comments directly above it — sliced verbatim into generated barrels. */
export const statementTextWithLeadingComments = (sourceFile: SourceFile, statement: Statement): string => {
  const fullStart = statement.getFullStart();
  const start = statement.getStart(sourceFile);
  const leading = sourceFile.text.slice(fullStart, start).replace(/^\s*\n+/, '');
  const body = sourceFile.text.slice(start, statement.getEnd());
  return (leading + body).trimEnd();
};

export type ExportConst = {
  name: string;
  statement: Statement;
  initializer: Expression;
};

/** All `export const NAME = ...` at top level. */
export const topLevelExportConsts = (sourceFile: SourceFile): ExportConst[] => {
  const out: ExportConst[] = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isVariableStatement(stmt)) {
      continue;
    }
    if (!stmt.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || !decl.initializer) {
        continue;
      }
      out.push({ name: decl.name.text, statement: stmt, initializer: decl.initializer });
    }
  }
  return out;
};

export type ExportDeclarationEntry =
  | { kind: 'star'; moduleSpecifier: string | null }
  | { kind: 'named'; isTypeOnly: boolean; localName: string; exportedName: string; moduleSpecifier: string | null };

/** All `export * from '...'` / `export { A as B } from '...'` entries. */
export const topLevelExportDeclarations = (sourceFile: SourceFile): ExportDeclarationEntry[] => {
  const out: ExportDeclarationEntry[] = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isExportDeclaration(stmt)) {
      continue;
    }
    const moduleSpecifier =
      stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
    if (stmt.exportClause === undefined) {
      out.push({ kind: 'star', moduleSpecifier });
    } else if (ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        out.push({
          kind: 'named',
          isTypeOnly: stmt.isTypeOnly || el.isTypeOnly,
          localName: (el.propertyName ?? el.name).text,
          exportedName: el.name.text,
          moduleSpecifier,
        });
      }
    }
  }
  return out;
};

/** Resolve a relative import specifier to a file on disk. */
export const resolveRelativeModule = (fromDir: string, spec: string): string | null => {
  if (!spec.startsWith('.')) {
    return null;
  }
  const base = path.resolve(fromDir, spec);
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

export type ImportDeclarationEntry = {
  text: string;
  boundNames: Set<string>;
};

/** Every top-level import declaration, with the local identifiers it binds. */
export const topLevelImportDeclarations = (sourceFile: SourceFile): ImportDeclarationEntry[] => {
  const out: ImportDeclarationEntry[] = [];
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt) || !stmt.importClause) {
      continue;
    }
    const boundNames = new Set<string>();
    const clause = stmt.importClause;
    if (clause.name) {
      boundNames.add(clause.name.text);
    }
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        boundNames.add(clause.namedBindings.name.text);
      } else if (ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          boundNames.add(el.name.text);
        }
      }
    }
    out.push({ text: nodeText(sourceFile, stmt), boundNames });
  }
  return out;
};

/**
 * Free identifiers referenced in a standalone snippet. Skips member-access property names and
 * non-computed object keys; otherwise over-collects — harmless, since callers only test membership
 * against known import bindings.
 */
export const collectFreeIdentifiers = (snippet: string): Set<string> => {
  const sf = ts.createSourceFile('snippet.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const names = new Set<string>();
  const isSkipped = (node: Node): boolean => {
    const parent = node.parent;
    if (!parent) {
      return false;
    }
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) {
      return true;
    }
    if (
      (ts.isPropertyAssignment(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isMethodSignature(parent)) &&
      parent.name === node
    ) {
      return true;
    }
    return false;
  };
  const visit = (node: Node): void => {
    if (ts.isIdentifier(node) && !isSkipped(node)) {
      names.add(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
};

/**
 * Rewrite every relative module specifier in a snippet (static `from '...'` and dynamic
 * `import('...')`) so text authored in `originDir` stays correct when emitted into `outDir`.
 */
export const rewriteRelativeSpecifiers = (snippet: string, originDir: string, outDir: string): string => {
  const sf = ts.createSourceFile('snippet.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const rewrite = (literal: import('typescript').StringLiteral): void => {
    if (!literal.text.startsWith('.')) {
      return;
    }
    const absolute = path.resolve(originDir, literal.text);
    let next = path.relative(outDir, absolute).split(path.sep).join('/');
    if (!next.startsWith('.')) {
      next = `./${next}`;
    }
    const quote = snippet[literal.getStart(sf)];
    edits.push({ start: literal.getStart(sf), end: literal.getEnd(), text: `${quote}${next}${quote}` });
  };
  const visit = (node: Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      rewrite(node.moduleSpecifier);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      rewrite(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  let result = snippet;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  return result;
};
