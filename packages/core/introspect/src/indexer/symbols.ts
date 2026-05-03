//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  type ExportedDeclarations,
  type JSDoc,
  type Node,
  Project,
  ScriptTarget,
  SyntaxKind,
} from 'ts-morph';

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
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: false,
      target: ScriptTarget.ESNext,
      jsx: 4 /* JsxEmit.ReactJSX */,
      noEmit: true,
      skipLibCheck: true,
    },
  });

  const symbols: ExtractedSymbol[] = [];
  for (const entry of pkg.entryPoints) {
    const entryPath = join(monorepoRoot, pkg.path, entry);
    if (!existsSync(entryPath)) {
      continue;
    }
    try {
      const source = project.addSourceFileAtPathIfExists(entryPath);
      if (!source) {
        continue;
      }
      const exported = source.getExportedDeclarations();
      for (const [name, declarations] of exported) {
        if (declarations.length === 0) {
          continue;
        }
        const decl = declarations[0];
        const extracted = describeSymbol(name, decl, monorepoRoot, pkg.name);
        if (extracted) {
          symbols.push(extracted);
        }
      }
    } catch (err) {
      log.warn('symbol extraction failed', { package: pkg.name, entry, err: String(err) });
    }
  }

  // De-duplicate by name (a symbol re-exported from multiple entry points).
  const seen = new Set<string>();
  const unique = symbols.filter((s) => {
    if (seen.has(s.name)) {
      return false;
    }
    seen.add(s.name);
    return true;
  });
  unique.sort((a, b) => a.name.localeCompare(b.name));

  return { packageName: pkg.name, symbols: unique };
};

const describeSymbol = (
  name: string,
  decl: ExportedDeclarations,
  monorepoRoot: string,
  packageName: string,
): ExtractedSymbol | null => {
  const kind = classifyDeclaration(decl);
  const sourceFile = decl.getSourceFile();
  const start = decl.getStart();
  const lineCol = sourceFile.getLineAndColumnAtPos(start);
  const location: SourceLocation = {
    file: relative(monorepoRoot, sourceFile.getFilePath()),
    line: lineCol.line,
    column: lineCol.column,
  };
  const signature = readSignature(decl);
  const jsdoc = readJSDoc(decl);
  return {
    name,
    ref: formatSymbolRef(packageName, name),
    kind,
    signature,
    jsdoc,
    summary: summarize(jsdoc),
    location,
    source: decl.getText(),
  };
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
  // Prefer ts-morph's own signature text where available; fall back to the first
  // line of the declaration. This is intentionally lightweight — we're optimizing
  // for indexing speed across thousands of files, not type-perfect rendering.
  const text = decl.getText();
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
  const firstLine = jsdoc.split('\n').map((s) => s.trim()).find((s) => s.length > 0);
  if (!firstLine) {
    return undefined;
  }
  return firstLine.length > 200 ? `${firstLine.slice(0, 197)}...` : firstLine;
};
