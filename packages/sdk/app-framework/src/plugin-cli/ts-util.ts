//
// Copyright 2026 DXOS.org
//

// Aliased: dx-compile's node banner injects its own `createRequire` binding into the bundle, so
// the bare name would collide.
import fs from 'node:fs';
import { createRequire as nodeCreateRequire } from 'node:module';
import path from 'node:path';

// The tool operates on the consumer's TypeScript source, so it borrows an existing compiler-API
// install instead of adding a heavyweight runtime dependency to app-framework that every browser
// consumer would download.
//
// `@typescript/typescript6` first: the `typescript` specifier now resolves to the 7.x native
// preview, which ships only `version` — no `createSourceFile`, no `ScriptTarget`. Resolution
// succeeding therefore proves nothing, so each candidate is probed for the API actually used here
// and skipped when it is absent; the same package the protobuf compiler imports for this reason.
const TYPESCRIPT_CANDIDATES = ['@typescript/typescript6', 'typescript'] as const;

const resolveTypescript = (): typeof import('@typescript/typescript6') => {
  const bases = [path.join(process.cwd(), 'package.json'), import.meta.url];
  for (const base of bases) {
    for (const specifier of TYPESCRIPT_CANDIDATES) {
      try {
        const module = nodeCreateRequire(base)(specifier);
        if (typeof module?.createSourceFile === 'function' && module.ScriptTarget) {
          return module;
        }
      } catch {
        continue;
      }
    }
  }
  throw new Error(
    `dx-plugin needs a TypeScript compiler API: install one of ${TYPESCRIPT_CANDIDATES.join(' or ')} in the target package or workspace.`,
  );
};

export const ts = resolveTypescript();

type SourceFile = import('@typescript/typescript6').SourceFile;
type Node = import('@typescript/typescript6').Node;
type Statement = import('@typescript/typescript6').Statement;
type Expression = import('@typescript/typescript6').Expression;

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

export type LocalDeclaration = {
  name: string;
  text: string;
};

/**
 * Top-level declarations a file keeps to itself — `const` and `function` without `export`. A kept
 * module statement can reference one (a helper the barrel author factored out), and it has to
 * travel with the statement or the generated barrel will not compile.
 */
export const topLevelLocalDeclarations = (sourceFile: SourceFile): LocalDeclaration[] => {
  const out: LocalDeclaration[] = [];
  const exported = (stmt: Statement): boolean =>
    (ts.canHaveModifiers(stmt) ? ts.getModifiers(stmt) : undefined)?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    ) ?? false;

  for (const stmt of sourceFile.statements) {
    if (exported(stmt)) {
      continue;
    }
    if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          out.push({ name: decl.name.text, text: statementTextWithLeadingComments(sourceFile, stmt) });
        }
      }
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, text: statementTextWithLeadingComments(sourceFile, stmt) });
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
  // The specifier may already carry its extension (`./foo/index.ts`) — resolve it directly rather
  // than appending another one on top, which would never exist on disk.
  if (/\.tsx?$/.test(base)) {
    return fs.existsSync(base) ? base : null;
  }
  const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

export type ImportDeclarationEntry = {
  text: string;
  boundNames: Set<string>;
  specifier: string;
  /** Whole-clause `import type`, distinct from a per-element `type` modifier. */
  isTypeOnly: boolean;
  defaultName: string | null;
  namespaceName: string | null;
  /** Named bindings as written, e.g. `Foo`, `Foo as Bar`, `type Foo`. */
  named: string[];
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
    const named: string[] = [];
    let namespaceName: string | null = null;
    if (clause.namedBindings) {
      if (ts.isNamespaceImport(clause.namedBindings)) {
        namespaceName = clause.namedBindings.name.text;
      } else if (ts.isNamedImports(clause.namedBindings)) {
        for (const el of clause.namedBindings.elements) {
          named.push(nodeText(sourceFile, el));
        }
      }
    }
    out.push({
      text: nodeText(sourceFile, stmt),
      boundNames,
      specifier: ts.isStringLiteralLike(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : '',
      isTypeOnly: clause.isTypeOnly,
      defaultName: clause.name?.text ?? null,
      namespaceName,
      named,
    });
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
/** Re-bases one relative module specifier from `originDir` to `outDir`; absolute ones pass through. */
export const rebaseSpecifier = (specifier: string, originDir: string, outDir: string): string => {
  if (!specifier.startsWith('.')) {
    return specifier;
  }
  const next = path.relative(outDir, path.resolve(originDir, specifier)).split(path.sep).join('/');
  return next.startsWith('.') ? next : `./${next}`;
};

export const rewriteRelativeSpecifiers = (snippet: string, originDir: string, outDir: string): string => {
  const sf = ts.createSourceFile('snippet.tsx', snippet, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const rewrite = (literal: import('@typescript/typescript6').StringLiteral): void => {
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
