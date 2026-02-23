#!/usr/bin/env node
/**
 * Tailwind / DXOS class audit tool.
 *
 * Scans TypeScript/TSX source files and CSS @apply directives for class
 * candidates, then validates each one against:
 *   1. The Tailwind v4 design system (loaded from the ui-theme entry point)
 *   2. Custom CSS class names defined in ui-theme's style sheets
 *
 * Candidates that pass neither check are reported as:
 *   - MALFORMED: looks like a broken Tailwind pattern (unclosed bracket, trailing dash, …)
 *   - UNKNOWN:   not defined anywhere in ui-theme or Tailwind core
 *
 * Usage:
 *   pnpm tsx scripts/audit-classes.mts [options]
 *
 * Options:
 *   --path <glob>     Restrict scan to files matching this pattern (relative to root)
 *   --class <name>    Check a single class name and exit
 *   --show-css        Print the generated CSS for each valid class (debug)
 *   --no-exit-code    Do not exit with code 1 when findings are present
 */

import { __unstable__loadDesignSystem } from 'tailwindcss';
import { Scanner } from '@tailwindcss/oxide';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// ── Paths ─────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEME_CSS_PATH = path.join(ROOT, 'packages/ui/ui-theme/src/theme.css');
const STYLES_DIR = path.join(ROOT, 'packages/ui/ui-theme/src/styles');

// Source globs that are scanned when no --path option is given.
const DEFAULT_SOURCES: Array<{ base: string; pattern: string; negated: boolean }> = [
  { base: path.join(ROOT, 'packages'), pattern: '**/*.{tsx,ts,jsx,js,css}', negated: false },
  { base: path.join(ROOT, 'packages'), pattern: '**/node_modules/**', negated: true },
  { base: path.join(ROOT, 'packages'), pattern: '**/dist/**', negated: true },
  { base: path.join(ROOT, 'tools'), pattern: '**/*.{tsx,ts,jsx,js}', negated: false },
  { base: path.join(ROOT, 'tools'), pattern: '**/node_modules/**', negated: true },
  { base: path.join(ROOT, 'tools'), pattern: '**/dist/**', negated: true },
];

// ── Custom-class allowlist extraction ────────────────────────────────────────

const MX_TS_PATH = path.join(ROOT, 'packages/ui/ui-theme/src/util/mx.ts');

/**
 * Walk every CSS file under `stylesDir` and collect all class names that appear
 * as selectors (e.g. `.dx-focus-ring`, `.base-surface`) or after `@utility`.
 * Also reads the mx.ts class group registrations.
 * The result is used as an allowlist for classes defined outside Tailwind core.
 */
function extractCustomClassNames(stylesDir: string): Set<string> {
  const classes = new Set<string>();

  const processContent = (content: string): void => {
    // Strip block comments
    const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Class selectors: leading dot preceded by whitespace / , { ( + ~ > or start-of-line
    const selectorRe = /(?:^|[\s,{(+~>])\.([a-zA-Z][a-zA-Z0-9_-]*)/gm;
    let m: RegExpExecArray | null;
    while ((m = selectorRe.exec(stripped)) !== null) {
      classes.add(m[1]);
    }
    // Tailwind v4 @utility registrations: "@utility foo { … }"
    const utilityRe = /@utility\s+([a-zA-Z][a-zA-Z0-9_-]*)/gm;
    while ((m = utilityRe.exec(stripped)) !== null) {
      classes.add(m[1]);
    }
  };

  const readDir = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        readDir(full);
      } else if (entry.name.endsWith('.css')) {
        processContent(fs.readFileSync(full, 'utf-8'));
      }
    }
  };

  readDir(stylesDir);

  // Also harvest class names registered in mx.ts (extendTailwindMerge groups).
  // These are classes the codebase explicitly declares as known custom utilities.
  if (fs.existsSync(MX_TS_PATH)) {
    const src = fs.readFileSync(MX_TS_PATH, 'utf-8');
    // Match string literals inside classGroups arrays: 'class-name'
    const strRe = /'([a-zA-Z][a-zA-Z0-9_-]*)'/g;
    let m: RegExpExecArray | null;
    while ((m = strRe.exec(src)) !== null) {
      classes.add(m[1]);
    }
  }

  return classes;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Convert a byte offset into 1-based line/column numbers. */
function byteOffsetToLineCol(content: string, offset: number): { line: number; col: number } {
  const before = content.substring(0, offset);
  const lines = before.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

/**
 * Heuristic check for structurally broken Tailwind candidates.
 * Returns true if the candidate looks like a partially-typed or mangled class.
 */
function isMalformed(candidate: string): boolean {
  // Unclosed arbitrary-value bracket
  const opens = (candidate.match(/\[/g) ?? []).length;
  const closes = (candidate.match(/\]/g) ?? []).length;
  if (opens !== closes) return true;

  // Trailing dash or colon — e.g. "text-" or "hover:"
  if (/[-:]$/.test(candidate)) return true;

  // Double dash not inside brackets and not a CSS custom property ref
  // (e.g. "bg--neutral" is broken, but "bg-[--color-foo]" is fine)
  if (/(?<!\[)--(?!\w)/.test(candidate)) return true;

  return false;
}

// Classes that the oxide scanner often extracts but are never Tailwind candidates
const NOISE_PATTERN =
  /^(?:data-|aria-|https?:|\/\/|#|\.|\d+$|[A-Z][a-z]+[A-Z]|[a-z]{1,2}$)/;

// ── Types ─────────────────────────────────────────────────────────────────────

interface Finding {
  file: string;
  line: number;
  col: number;
  candidate: string;
  kind: 'unknown' | 'malformed';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i !== -1 ? argv[i + 1] : null;
  };
  const has = (flag: string) => argv.includes(flag);

  const filterPath = get('--path');
  const singleClass = get('--class');
  const showCss = has('--show-css');
  const noExitCode = has('--no-exit-code');

  // ── Load design system ──────────────────────────────────────────────────────
  console.log('Loading Tailwind v4 design system from ui-theme…');
  const t0 = Date.now();
  const themeCss = fs.readFileSync(THEME_CSS_PATH, 'utf-8');
  const themeBase = path.dirname(THEME_CSS_PATH);

  // Resolver that handles npm package specifiers (bare, scoped) and relative paths.
  const req = createRequire(pathToFileURL(THEME_CSS_PATH).href);

  const loadStylesheet = async (id: string, base: string) => {
    if (id.startsWith('.') || id.startsWith('/')) {
      // Relative or absolute path
      const resolved = path.resolve(base, id);
      return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf-8') };
    }
    // Package specifier — resolve through node_modules starting from the theme CSS location.
    // For 'tailwindcss', resolve to its index.css stylesheet entry.
    const specifier = id === 'tailwindcss' ? 'tailwindcss/index.css' : id;
    const resolved = req.resolve(specifier);
    return { path: resolved, base: path.dirname(resolved), content: fs.readFileSync(resolved, 'utf-8') };
  };

  const loadModule = async (id: string, base: string, _hint: string) => {
    // Resolve from the theme package location so pnpm can find transitive deps.
    const resolved = id.startsWith('.') ? path.resolve(base, id) : req.resolve(id);
    const mod = await import(pathToFileURL(resolved).href);
    return { path: resolved, base: path.dirname(resolved), module: mod.default ?? mod };
  };

  const ds = await __unstable__loadDesignSystem(themeCss, {
    base: themeBase,
    loadStylesheet,
    loadModule,
  } as Parameters<typeof __unstable__loadDesignSystem>[1]);
  console.log(`  Design system ready  (${Date.now() - t0}ms)`);

  // ── Single-class check mode ─────────────────────────────────────────────────
  if (singleClass) {
    const [css] = ds.candidatesToCss([singleClass]);
    if (css !== null) {
      console.log(`\n✓  "${singleClass}" is a valid Tailwind class.`);
      if (showCss) console.log('\nGenerated CSS:\n' + css);
    } else {
      const customClasses = extractCustomClassNames(STYLES_DIR);
      if (customClasses.has(singleClass)) {
        console.log(`\n✓  "${singleClass}" is a custom DXOS class (defined in ui-theme CSS).`);
      } else if (isMalformed(singleClass)) {
        console.log(`\n✗  "${singleClass}" appears MALFORMED.`);
        process.exit(1);
      } else {
        console.log(`\n?  "${singleClass}" is UNKNOWN (not Tailwind, not custom DXOS).`);
        process.exit(1);
      }
    }
    return;
  }

  // ── Extract custom CSS classes ──────────────────────────────────────────────
  console.log('Extracting custom class names from ui-theme styles…');
  const customClasses = extractCustomClassNames(STYLES_DIR);
  console.log(`  ${customClasses.size} custom class names collected`);

  // ── Set up scanner ──────────────────────────────────────────────────────────
  const sources = filterPath
    ? [{ base: ROOT, pattern: filterPath, negated: false }]
    : DEFAULT_SOURCES;

  const scanner = new Scanner({ sources });

  console.log('Discovering source files…');
  scanner.scan(); // populate scanner.files
  const files = scanner.files;
  console.log(`  ${files.length} files to scan`);

  // ── Per-file candidate extraction ───────────────────────────────────────────
  // candidateOccurrences: candidate → list of {file, line, col}
  const candidateOccurrences = new Map<string, Array<{ file: string; line: number; col: number }>>();

  let scanned = 0;
  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const ext = path.extname(filePath).slice(1) || 'txt';
    const withPos = scanner.getCandidatesWithPositions({ content, extension: ext });

    for (const { candidate, position } of withPos) {
      if (NOISE_PATTERN.test(candidate)) continue;
      const loc = byteOffsetToLineCol(content, position);
      const relFile = path.relative(ROOT, filePath);
      const list = candidateOccurrences.get(candidate) ?? [];
      list.push({ file: relFile, line: loc.line, col: loc.col });
      candidateOccurrences.set(candidate, list);
    }
    scanned++;
    if (scanned % 500 === 0) process.stdout.write(`  …${scanned}/${files.length}\r`);
  }
  process.stdout.write('\n');

  // ── Batch validation ────────────────────────────────────────────────────────
  console.log(`Validating ${candidateOccurrences.size} unique candidates…`);
  const candidateList = Array.from(candidateOccurrences.keys());
  const cssResults = ds.candidatesToCss(candidateList);

  const validTailwind = new Set<string>();
  for (let i = 0; i < candidateList.length; i++) {
    if (cssResults[i] !== null) validTailwind.add(candidateList[i]);
  }

  // ── Classify ────────────────────────────────────────────────────────────────
  const findings: Finding[] = [];

  for (const [candidate, occurrences] of candidateOccurrences) {
    if (validTailwind.has(candidate)) continue;
    if (customClasses.has(candidate)) continue;

    const kind = isMalformed(candidate) ? 'malformed' : 'unknown';
    for (const { file, line, col } of occurrences) {
      findings.push({ file, line, col, candidate, kind });
    }
  }

  // ── Report ───────────────────────────────────────────────────────────────────
  const malformed = findings.filter((f) => f.kind === 'malformed');
  const unknown = findings.filter((f) => f.kind === 'unknown');

  const hr = '─'.repeat(80);
  console.log('\n' + hr);

  if (findings.length === 0) {
    console.log('✓  No unknown or malformed class candidates found.\n');
    return;
  }

  // --- Malformed ---
  if (malformed.length > 0) {
    console.log(`\n🔴  MALFORMED  (${malformed.length} occurrence${malformed.length > 1 ? 's' : ''})\n`);
    let prevFile = '';
    const sorted = [...malformed].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    for (const f of sorted) {
      if (f.file !== prevFile) {
        console.log(`  ${f.file}`);
        prevFile = f.file;
      }
      console.log(`    ${String(f.line).padStart(4)}:${String(f.col).padEnd(4)}  ${f.candidate}`);
    }
  }

  // --- Unknown — grouped by class name, sorted by frequency ---
  if (unknown.length > 0) {
    console.log(`\n🟡  UNKNOWN  (${unknown.length} occurrence${unknown.length > 1 ? 's' : ''})\n`);

    const byClass = new Map<string, Array<{ file: string; line: number; col: number }>>();
    for (const f of unknown) {
      const arr = byClass.get(f.candidate) ?? [];
      arr.push({ file: f.file, line: f.line, col: f.col });
      byClass.set(f.candidate, arr);
    }

    const sorted = Array.from(byClass.entries()).sort((a, b) => b[1].length - a[1].length);

    for (const [cls, locs] of sorted) {
      console.log(`  .${cls}  ×${locs.length}`);
      const shown = locs.slice(0, 5);
      for (const { file, line, col } of shown) {
        console.log(`    ${file}:${line}:${col}`);
      }
      if (locs.length > 5) console.log(`    … and ${locs.length - 5} more`);
      console.log();
    }
  }

  // --- Summary ---
  console.log(hr);
  console.log(
    `\nSummary: ${malformed.length} malformed, ${unknown.length} unknown occurrences` +
      `  |  scanned ${scanned} files, ${candidateOccurrences.size} unique candidates\n`,
  );

  if (!noExitCode) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
