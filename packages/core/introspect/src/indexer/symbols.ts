//
// Copyright 2026 DXOS.org
//

import { globSync } from 'glob';
import { join, relative } from 'node:path';
import { type ExportedDeclarations, type JSDoc, type Node, Project, ScriptTarget, SyntaxKind } from 'ts-morph';

import { log } from '@dxos/log';

import { formatSymbolRef } from '../refs';
import type { SourceLocation, SymbolKind } from '../types';

export type ExtractedSymbol = {
  name: string;
  ref: string;
  kind: SymbolKind;
  signature: string;
  jsdoc?: string;
  summary?: string;
  location: SourceLocation;
  /** Source text of the declaration (single representative declaration). */
  source: string;
};

export type PackageSymbols = {
  packageName: string;
  symbols: ExtractedSymbol[];
};

type PackageLike = {
  name: string;
  path: string;
  entryPoints: string[];
};

/**
 * Extract exported symbols from a package's entry points.
 *
 * Uses a per-package ts-morph Project so each package is parsed in isolation.
 * Errors are logged and produce an empty result rather than throwing — the
 * indexer's job is best-effort coverage, not strict validation.
 */
export const extractSymbols = (monorepoRoot: string, pkg: PackageLike): PackageSymbols => {
  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    // We walk all source files explicitly (see below), so we don't need ts-morph
    // to follow imports. Skipping resolution keeps each package's parse cost
    // bounded and avoids spurious failures when a workspace dep isn't built.
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: false,
      target: ScriptTarget.ESNext,
      jsx: 4 /* JsxEmit.ReactJSX */,
      noEmit: true,
      skipLibCheck: true,
    },
  });

  // Walk every TypeScript source file in the package's `src/` directory rather
  // than relying on ts-morph to follow re-export chains from the entry point.
  // This makes the indexer robust to namespace re-exports (`export * as X`) and
  // multi-hop barrels, and keeps each file's symbols visible at their original
  // declaration site — which is what callers actually want from getSymbol.
  const files = globSync('src/**/*.{ts,tsx}', {
    cwd: join(monorepoRoot, pkg.path),
    ignore: ['**/*.test.{ts,tsx}', '**/*.stories.{ts,tsx}', '**/__fixtures__/**', '**/__tests__/**'],
    absolute: true,
    nodir: true,
  });

  const symbols: ExtractedSymbol[] = [];
  for (const filePath of files) {
    try {
      const source = project.addSourceFileAtPathIfExists(filePath);
      if (!source) {
        continue;
      }
      const exported = source.getExportedDeclarations();
      for (const [name, declarations] of exported) {
        if (declarations.length === 0) {
          continue;
        }
        const extracted = describeSymbol(name, declarations, monorepoRoot, pkg.name);
        if (extracted) {
          symbols.push(extracted);
        }
      }
    } catch (err) {
      log.warn('symbol extraction failed', { package: pkg.name, file: filePath, err: String(err) });
    }
  }

  // Dedup by name. When the same name appears in multiple files (e.g. a
  // barrel's namespace re-export plus the original declaration), prefer the
  // entry whose primary declaration carries the most information — value/type
  // declarations beat namespace re-exports.
  const byName = new Map<string, ExtractedSymbol>();
  for (const sym of symbols) {
    const existing = byName.get(sym.name);
    if (!existing || preferenceScore(sym) > preferenceScore(existing)) {
      byName.set(sym.name, sym);
    }
  }
  const unique = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
  return { packageName: pkg.name, symbols: unique };
};

const preferenceScore = (sym: ExtractedSymbol): number => {
  // Higher = preferred. Concrete declarations beat re-exports; runtime entities
  // beat type-only ones since callers can do more with them.
  switch (sym.kind) {
    case 'class':
    case 'function':
      return 5;
    case 'variable':
    case 'enum':
      return 4;
    case 'interface':
    case 'type':
      return 3;
    case 'namespace':
      return 1;
    default:
      return 0;
  }
};

const describeSymbol = (
  name: string,
  declarations: readonly ExportedDeclarations[],
  monorepoRoot: string,
  packageName: string,
): ExtractedSymbol | null => {
  // ECHO idiom emits a value AND a same-named interface companion:
  //   export const Task = Schema.Struct({...}).pipe(Type.object({...}));
  //   export interface Task extends Schema.Schema.Type<typeof Task> {}
  // We surface them as a single symbol so callers see both forms in `source`.
  // The "primary" declaration drives signature/location/kind; the rest contribute
  // their text so the full pattern is visible.
  const primary = pickPrimary(declarations);
  const kind = classifyDeclaration(primary);
  const sourceFile = primary.getSourceFile();
  const start = primary.getStart();
  const lineCol = sourceFile.getLineAndColumnAtPos(start);
  const location: SourceLocation = {
    file: relative(monorepoRoot, sourceFile.getFilePath()),
    line: lineCol.line,
    column: lineCol.column,
  };
  const signature = readSignature(primary);
  const jsdoc = readJSDoc(primary) ?? declarations.map(readJSDoc).find((d) => d !== undefined);
  const source = declarations.map(declarationText).join('\n\n');
  return {
    name,
    ref: formatSymbolRef(packageName, name),
    kind,
    signature,
    jsdoc,
    summary: summarize(jsdoc),
    location,
    source,
  };
};

// Return the declaration text including any leading `export` modifier.
// `VariableDeclaration.getText()` returns just the declarator (`x = 1`), missing
// the `export const` from the parent VariableStatement — climb when needed.
const declarationText = (decl: ExportedDeclarations): string => {
  if (decl.getKind() === SyntaxKind.VariableDeclaration) {
    const stmt = decl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
    if (stmt) {
      return stmt.getText();
    }
  }
  return decl.getText();
};

// Pick the "most informative" declaration for a merged export. The value
// declaration (variable/function/class) is what callers can actually use at
// runtime, so we prefer it; type-only companions (interface/type alias) are
// supplementary. Falls back to the first declaration if none qualify.
const pickPrimary = (declarations: readonly ExportedDeclarations[]): ExportedDeclarations => {
  const valueKinds = new Set<SyntaxKind>([
    SyntaxKind.VariableDeclaration,
    SyntaxKind.FunctionDeclaration,
    SyntaxKind.ClassDeclaration,
    SyntaxKind.EnumDeclaration,
  ]);
  return declarations.find((d) => valueKinds.has(d.getKind())) ?? declarations[0];
};

const classifyDeclaration = (decl: ExportedDeclarations): SymbolKind => {
  switch (decl.getKind()) {
    case SyntaxKind.FunctionDeclaration:
    case SyntaxKind.ArrowFunction:
    case SyntaxKind.FunctionExpression:
      return 'function';
    case SyntaxKind.ClassDeclaration:
      return 'class';
    case SyntaxKind.InterfaceDeclaration:
      return 'interface';
    case SyntaxKind.TypeAliasDeclaration:
      return 'type';
    case SyntaxKind.EnumDeclaration:
      return 'enum';
    case SyntaxKind.ModuleDeclaration:
      return 'namespace';
    case SyntaxKind.VariableDeclaration: {
      const initializer = (decl as unknown as { getInitializer?: () => Node | undefined }).getInitializer?.();
      if (initializer) {
        const k = initializer.getKind();
        if (k === SyntaxKind.ArrowFunction || k === SyntaxKind.FunctionExpression) {
          return 'function';
        }
      }
      return 'variable';
    }
    default:
      return 'unknown';
  }
};

const readSignature = (decl: ExportedDeclarations): string => {
  // Lightweight: take the declaration's first line (or up to the first opening
  // brace, whichever comes first). Optimized for indexing speed across
  // thousands of files, not type-perfect rendering.
  const text = declarationText(decl);
  const firstBrace = text.indexOf('{');
  const firstNewline = text.indexOf('\n');
  const cut = [firstBrace, firstNewline].filter((n) => n > 0);
  const stop = cut.length > 0 ? Math.min(...cut) : text.length;
  return text.slice(0, stop).trim();
};

const readJSDoc = (decl: ExportedDeclarations): string | undefined => {
  // Climb up to the nearest node carrying JSDoc. For `export const foo = ...`
  // the comment is attached to the VariableStatement, not the VariableDeclaration.
  let cursor: Node | undefined = decl;
  while (cursor) {
    const candidate = cursor as unknown as { getJsDocs?: () => JSDoc[] };
    if (typeof candidate.getJsDocs === 'function') {
      const docs = candidate.getJsDocs();
      if (docs && docs.length > 0) {
        const text = docs
          .map((d) => d.getCommentText() ?? '')
          .filter((s) => s.length > 0)
          .join('\n\n');
        if (text.length > 0) {
          return text;
        }
      }
    }
    if (cursor.getKind() === SyntaxKind.SourceFile) {
      break;
    }
    cursor = cursor.getParent();
  }
  return undefined;
};

const summarize = (jsdoc: string | undefined): string | undefined => {
  if (!jsdoc) {
    return undefined;
  }
  const firstLine = jsdoc
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (!firstLine) {
    return undefined;
  }
  return firstLine.length > 200 ? `${firstLine.slice(0, 197)}...` : firstLine;
};
