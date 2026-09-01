#!/usr/bin/env -S pnpm tsx
//
// Copyright 2026 DXOS.org
//

// Rewrites relative import/export/dynamic-import specifiers to include explicit
// file extensions matching the filesystem (./foo.ts, ./dir/index.tsx), per
// tsconfig.base.json's `rewriteRelativeImportExtensions`. Operates on raw source
// text spans so unrelated formatting is untouched.

import { glob } from 'glob';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

// The workspace's `typescript` catalog entry is TS 7 (tsgo, the native Go port), whose package
// exports no longer include the classic synchronous parser API this codemod needs. Load a
// throwaway classic-TypeScript copy for parsing only — TS_PARSER_PATH points at a `node_modules`
// dir containing it (see scripts/migrate-esm-imports.md for how it was installed).
const requireForParser = createRequire(import.meta.url);
const parserPath = process.env.TS_PARSER_PATH;
if (!parserPath) {
  throw new Error('Set TS_PARSER_PATH to a node_modules directory containing a classic `typescript` install.');
}
const ts = requireForParser(requireForParser.resolve('typescript', { paths: [parserPath] }));

const ROOT = resolve(__dirname, '..');

const CODE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];
// Only consulted when a bare specifier resolves to no .ts/.tsx file — a handful of relative imports
// point at genuine (often generated/vendored) .js output rather than TypeScript source.
const FALLBACK_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs'];

/** True if the final path segment already carries *some* extension (e.g. `.sql`, `.webp?raw` after stripping the query). */
function hasAnyExtension(base: string): boolean {
  const lastSegment = base.slice(base.lastIndexOf('/') + 1);
  return /\.[^./]+$/.test(lastSegment);
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

interface FileStats {
  edits: number;
  unresolved: string[];
}

const dirCache = new Map<string, Set<string>>();

function listDir(dir: string): Set<string> {
  let cached = dirCache.get(dir);
  if (!cached) {
    cached = new Set<string>();
    try {
      for (const entry of readdirSync(dir)) {
        cached.add(entry);
      }
    } catch {
      // Directory doesn't exist; leave empty.
    }
    dirCache.set(dir, cached);
  }
  return cached;
}

function fileExists(path: string): boolean {
  const dir = dirname(path);
  const base = path.slice(dir.length + 1);
  return listDir(dir).has(base);
}

function isDirectory(path: string): boolean {
  if (!fileExists(path)) return false;
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** Resolves a bare relative specifier (no recognized extension) against the filesystem. */
function resolveBareSpecifier(fromDir: string, specifier: string): string | null {
  // `join` preserves a trailing slash (e.g. specifier '../' resolving to '.../src/'), which would
  // otherwise make the basename lookup below compare against '' instead of the real directory name.
  const abs = join(fromDir, specifier).replace(/\/+$/, '');

  for (const ext of [...CODE_EXTENSIONS, ...FALLBACK_EXTENSIONS]) {
    if (fileExists(abs + ext) && !isDirectory(abs + ext)) {
      return specifier + ext;
    }
  }

  if (isDirectory(abs)) {
    for (const ext of [...CODE_EXTENSIONS, ...FALLBACK_EXTENSIONS]) {
      const indexPath = join(abs, 'index' + ext);
      if (fileExists(indexPath)) {
        const sep = specifier.endsWith('/') ? '' : '/';
        return specifier + sep + 'index' + ext;
      }
    }
  }

  return null;
}

/** Given a raw specifier text (already stripped of quotes), returns the corrected specifier or null if unchanged/unresolved. */
function resolveSpecifier(fromDir: string, specifier: string): { resolved: string | null; unresolved: boolean } {
  if (!specifier.startsWith('.')) return { resolved: null, unresolved: false };

  // Split off any query/hash suffix (vite-style ?worker, ?raw, ?url, etc.).
  const match = specifier.match(/^([^?#]*)([?#].*)?$/);
  const base = match?.[1] ?? specifier;
  const suffix = match?.[2] ?? '';

  const knownExt = CODE_EXTENSIONS.find((ext) => base.endsWith(ext));
  if (knownExt) {
    // Already has a code extension — verify it matches the filesystem.
    const abs = join(fromDir, base);
    if (fileExists(abs) && !isDirectory(abs)) return { resolved: null, unresolved: false };
    // Wrong extension (e.g. .js written for a .ts file) — try to find the real one. If nothing on
    // disk matches either way, leave it alone rather than flagging it: a specifier that already
    // ends in .ts/.tsx may point at a not-yet-generated file (e.g. protobuf codegen output) rather
    // than a genuinely broken import.
    const withoutExt = base.slice(0, -knownExt.length);
    const fixed = resolveBareSpecifier(fromDir, withoutExt);
    if (fixed && fixed !== base) return { resolved: fixed + suffix, unresolved: false };
    return { resolved: null, unresolved: false };
  }

  // A non-code asset (`.sql`, `.webp`, `.mdl`, …) already carries its own extension — not in scope.
  if (hasAnyExtension(base)) return { resolved: null, unresolved: false };

  const fixed = resolveBareSpecifier(fromDir, base);
  if (fixed) return { resolved: fixed + suffix, unresolved: false };
  return { resolved: null, unresolved: true };
}

// The classic-TypeScript parser is loaded dynamically with no matching type declarations
// available (see above), so the AST it produces is necessarily untyped here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TSAny = any;

function collectStringLiteralTargets(sourceFile: TSAny): TSAny[] {
  const targets: TSAny[] = [];

  const visit = (node: TSAny) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      targets.push(node.moduleSpecifier);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      targets.push(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      targets.push(node.argument.literal);
    } else if (
      // `new Worker(new URL('./worker', import.meta.url))` — a module reference the bundler
      // resolves like an import. A bare `new URL(str, import.meta.url)` NOT wrapped in
      // Worker/SharedWorker is typically a plain filesystem path (readdirSync, fileURLToPath,
      // __dirname-equivalents) and must not be treated as a module specifier.
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'Worker' || node.expression.text === 'SharedWorker') &&
      node.arguments &&
      node.arguments.length > 0 &&
      ts.isNewExpression(node.arguments[0]) &&
      ts.isIdentifier(node.arguments[0].expression) &&
      node.arguments[0].expression.text === 'URL' &&
      node.arguments[0].arguments &&
      node.arguments[0].arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0].arguments[0])
    ) {
      targets.push(node.arguments[0].arguments[0]);
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      (node.expression.expression.text === 'vi' || node.expression.expression.text === 'jest') &&
      ['mock', 'doMock', 'importActual', 'importMock', 'unmock', 'doUnmock'].includes(node.expression.name.text) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      targets.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return targets;
}

function processFile(filePath: string): FileStats {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile: TSAny = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const fromDir = dirname(filePath);
  const edits: Edit[] = [];
  const unresolved: string[] = [];

  for (const node of collectStringLiteralTargets(sourceFile)) {
    const specifier = node.text;
    const { resolved, unresolved: isUnresolved } = resolveSpecifier(fromDir, specifier);
    if (resolved) {
      const quote = source[node.getStart(sourceFile)];
      edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: `${quote}${resolved}${quote}` });
    } else if (isUnresolved) {
      unresolved.push(specifier);
    }
  }

  if (edits.length === 0) return { edits: 0, unresolved };

  edits.sort((a, b) => b.start - a.start);
  let result = source;
  for (const edit of edits) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
  }
  writeFileSync(filePath, result);

  return { edits: edits.length, unresolved };
}

async function main() {
  const patterns = process.argv.slice(2);
  const globs =
    patterns.length > 0
      ? patterns
      : ['packages/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}', 'tools/**/*.{ts,tsx}', 'templates/**/*.{ts,tsx}'];

  const files = await glob(globs, {
    cwd: ROOT,
    absolute: true,
    nodir: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.moon/**',
      '**/storybook-static/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/.store/**',
      '**/.depot/**',
    ],
  });

  let filesChanged = 0;
  let totalEdits = 0;
  const allUnresolved = new Map<string, string[]>();

  for (const file of files) {
    const stats = processFile(file);
    if (stats.edits > 0) {
      filesChanged++;
      totalEdits += stats.edits;
    }
    if (stats.unresolved.length > 0) {
      allUnresolved.set(file, stats.unresolved);
    }
  }

  console.log(`Scanned ${files.length} files.`);
  console.log(`Changed ${filesChanged} files, ${totalEdits} specifiers rewritten.`);
  if (allUnresolved.size > 0) {
    console.log(`\n${allUnresolved.size} files with unresolved specifiers:`);
    for (const [file, specs] of allUnresolved) {
      console.log(`  ${file.slice(ROOT.length + 1)}: ${specs.join(', ')}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
