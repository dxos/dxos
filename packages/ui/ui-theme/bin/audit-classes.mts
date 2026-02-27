#!/usr/bin/env node
/**
 * Tailwind / DXOS class audit tool.
 *
 * Scans TSX/JSX source files and CSS @apply directives for class candidates,
 * then validates each one against:
 *   1. The Tailwind v4 design system (loaded from the ui-theme entry point)
 *   2. Custom CSS class names defined in ui-theme's style sheets
 *
 * Candidates that pass neither check are reported as:
 *   - MALFORMED: looks like a broken Tailwind pattern (unclosed bracket, trailing dash, …)
 *   - UNKNOWN:   not defined anywhere in ui-theme or Tailwind core
 *
 * Usage:
 *   pnpm -w audit-classes [options]
 *
 * Options:
 *   --path <glob>       Restrict scan to files matching this pattern (relative to root)
 *   --class <name>      Check a single class name and exit
 *   --show-css          Print the generated CSS for each valid class (debug)
 *   --exit-code         Exit with code 1 when findings are present
 *   --extensions <list>  Comma-separated file extensions to scan (default: tsx,jsx,css)
 *   --verbose            Show file locations for each finding
 *   --top <n>           Show only the top N unknown classes (default: 50)
 */

import { __unstable__loadDesignSystem } from 'tailwindcss';
import { Scanner } from '@tailwindcss/oxide';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

// minimatch is a transitive CJS dependency — load via createRequire (ESM scope).
const _req = createRequire(import.meta.url);
const minimatch = _req('minimatch') as (path: string, pattern: string, opts?: object) => boolean;

//
// Paths
//

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const THEME_CSS_PATH = path.resolve(__dirname, '../src/theme.css');
const STYLES_DIR = path.resolve(__dirname, '../src/config');
const TWIGNORE_PATH = path.join(ROOT, '.twignore');

// Load ignore patterns from `.twignore` in the project root.
// Each non-empty, non-comment line is treated as a glob pattern matched against file paths relative to the project root.
//
// Example .twignore:
//   # Ignore test data
//   packages/**/testing/**
//   **/*.test.tsx
function loadIgnorePatterns(): string[] {
  if (!fs.existsSync(TWIGNORE_PATH)) return [];
  return fs
    .readFileSync(TWIGNORE_PATH, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/** Returns true if the relative file path matches any pattern in `.twignore`. */
function isIgnored(relPath: string, patterns: string[]): boolean {
  // Normalise to forward slashes for cross-platform glob matching.
  const fwd = relPath.replace(/\\/g, '/');
  return patterns.some((pattern) => minimatch(fwd, pattern, { dot: true, matchBase: false }));
}

// Source globs that are scanned when no --path option is given.
// Default: only TSX/JSX (React components) and CSS (@apply directives).
// Use --extensions to specify custom extensions (e.g., --extensions tsx,ts,css).
const DEFAULT_EXTENSIONS = 'tsx,jsx,css';

/** Build scanner source entries for the given comma-separated extensions. */
function buildSources(extensions: string): Array<{ base: string; pattern: string; negated: boolean }> {
  return [
    { base: path.join(ROOT, 'packages'), pattern: `**/*.{${extensions}}`, negated: false },
    { base: path.join(ROOT, 'packages'), pattern: '**/node_modules/**', negated: true },
    { base: path.join(ROOT, 'packages'), pattern: '**/dist/**', negated: true },
  ];
}

//
// Custom-class allowlist extraction
//

const MX_TS_PATH = path.resolve(__dirname, '../src/util/mx.ts');
const PACKAGES_DIR = path.join(ROOT, 'packages');

/**
 * Extract all class names that appear as selectors or @utility names in a CSS
 * file's content. Used to build the custom-class allowlist.
 */
function extractClassNamesFromCss(content: string, classes: Set<string>): void {
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Class selectors: leading dot preceded by whitespace / , { ( + ~ > or start-of-line
  const selectorRe = /(?:^|[\s,{(+~>])\.([a-zA-Z][a-zA-Z0-9_-]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = selectorRe.exec(stripped)) !== null) {
    classes.add(m[1]);
  }
  // Tailwind v4 @utility registrations
  const utilityRe = /@utility\s+([a-zA-Z][a-zA-Z0-9_-]*)/gm;
  while ((m = utilityRe.exec(stripped)) !== null) {
    classes.add(m[1]);
  }
}

/**
 * Walk a directory tree and collect CSS class names from all .css files.
 * Skips node_modules and dist directories.
 */
function readCssDir(dir: string, classes: Set<string>): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      readCssDir(full, classes);
    } else if (entry.name.endsWith('.css')) {
      try {
        extractClassNamesFromCss(fs.readFileSync(full, 'utf-8'), classes);
      } catch {
        // ignore unreadable files
      }
    }
  }
}

/**
 * Build the custom-class allowlist by scanning:
 *   1. ui-theme config CSS (utility classes, dx-* selectors)
 *   2. ALL package-level CSS files (component-specific selectors)
 *   3. mx.ts tailwind-merge class group registrations
 */
function extractCustomClassNames(stylesDir: string): Set<string> {
  const classes = new Set<string>();

  // ui-theme config directory — highest priority
  readCssDir(stylesDir, classes);

  // All other CSS files across the packages tree
  readCssDir(PACKAGES_DIR, classes);

  // Harvest class names registered in mx.ts (extendTailwindMerge groups).
  if (fs.existsSync(MX_TS_PATH)) {
    const src = fs.readFileSync(MX_TS_PATH, 'utf-8');
    const strRe = /'([a-zA-Z][a-zA-Z0-9_-]*)'/g;
    let m: RegExpExecArray | null;
    while ((m = strRe.exec(src)) !== null) {
      classes.add(m[1]);
    }
  }

  return classes;
}

//
// Utilities
//

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

// JS/TS keywords and common words the oxide scanner extracts from .ts files.
const JS_KEYWORDS = new Set([
  'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case',
  'catch', 'class', 'const', 'constructor', 'continue', 'debugger', 'declare',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false',
  'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import',
  'in', 'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module',
  'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'out',
  'override', 'package', 'private', 'protected', 'public', 'readonly',
  'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol',
  'target', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'unique', 'unknown', 'using', 'var', 'void', 'while', 'with', 'yield',
  // Common identifiers the scanner also picks up
  'name', 'value', 'id', 'key', 'data', 'props', 'state', 'event', 'error',
  'result', 'response', 'request', 'config', 'options', 'params', 'context',
  'node', 'root', 'item', 'items', 'list', 'index', 'count', 'size', 'width',
  'height', 'ref', 'label', 'title', 'text', 'icon', 'style', 'theme',
  'color', 'colors', 'path', 'url', 'src', 'href', 'alt', 'role',
  // English words that appear in comments / string literals
  'the', 'and', 'or', 'not', 'for', 'with', 'but', 'can', 'has', 'have',
  'been', 'will', 'are', 'was', 'were', 'use', 'used', 'get', 'set',
  'add', 'all', 'any', 'new', 'old', 'end', 'map', 'tag', 'row', 'col',
  'top', 'left', 'right', 'bottom', 'back', 'next', 'prev', 'none',
]);

// Candidates that the oxide scanner extracts but are never Tailwind class candidates.
// A string is likely a class only if it:  (a) contains a dash or colon, OR
// (b) passes candidatesToCss (handled later), OR (c) is in the custom set.
// This pre-filter removes JS keywords and common words without dashes.
function isLikelyClassCandidate(candidate: string): boolean {
  if (candidate.length > MAX_CANDIDATE_LENGTH) return false;
  // Must not be a known JS keyword / common word (when no dash/colon present)
  if (!candidate.includes('-') && !candidate.includes(':')) {
    if (JS_KEYWORDS.has(candidate)) return false;
    // Single words with no dash: only keep if very short (likely Tailwind
    // one-word utilities like 'flex', 'hidden') — longer ones are probably prose.
    // candidatesToCss will filter them further; we just skip obvious noise.
    if (candidate.length > 8) return false;
  }
  return true;
}

/**
 * Returns true for class candidates that are structurally valid Tailwind syntax
 * but not emitted as CSS because they are identifiers, not utility classes.
 *
 * Examples:
 *   - `group/scroll-v` — marks a named scroll group; children use `group-hover/scroll-v:`
 *   - `peer/input`     — marks a named peer; siblings use `peer-focus/input:`
 *   - `dark`           — context modifier; generates no CSS on its own
 *   - `ltr`, `rtl`     — direction modifiers
 */
function isKnownIdentifierClass(candidate: string): boolean {
  // Named group/peer syntax: group/{name} or peer/{name}
  if (/^(?:group|peer)\/[\w-]+$/.test(candidate)) return true;
  // Standalone context modifiers
  if (/^(?:dark|light|ltr|rtl)$/.test(candidate)) return true;
  return false;
}

// Oxide-scanner noise: skip these even before the keyword check.
// Filters: HTML attrs, URLs, hex colors, CSS selectors, CamelCase, ACRONYMS,
//          paths with 2+ slashes, pure numbers, underscore-prefixed identifiers,
//          CSS at-rules / npm package names (starting with @).
const NOISE_PATTERN =
  /^(?:data-|aria-|https?:|\/\/|[#.@]|\d+$|.*\/.+\/|[A-Z][a-z]*[A-Z]|.*[A-Z]{2,}|_)/;

/**
 * Returns true if the candidate contains an uppercase letter outside of
 * square brackets.  Tailwind class names are always lowercase outside
 * arbitrary-value brackets — camelCase strings are prop names / identifiers.
 */
function hasCamelCase(candidate: string): boolean {
  let depth = 0;
  for (const ch of candidate) {
    if (ch === '[') { depth++; continue; }
    if (ch === ']') { depth--; continue; }
    if (depth === 0 && ch >= 'A' && ch <= 'Z') return true;
  }
  return false;
}

/** Returns true if the candidate is too long to plausibly be a class name. */
const MAX_CANDIDATE_LENGTH = 80;

// File path patterns to skip entirely (not UI source — contain word lists,
// generated data, or test fixtures that would produce thousands of false positives).
const SKIP_FILE_PATTERNS = [
  /\/display-name\//,       // word-list data files (adjectives, animals)
  /\.test\.(ts|tsx)$/,       // test files (less interesting for class auditing)
  /\.stories\.(ts|tsx)$/,    // stories (handled separately if needed)
  /\/dist\//,
  /\/node_modules\//,
];

// Noise patterns for specific known non-Tailwind class families.
const EXTRA_NOISE_PATTERNS: RegExp[] = [
  /^ph--/,                       // Phosphor icon font: ph--icon-name--weight
  /^eslint-/,                    // ESLint directives in comments
  /^prettier-/,                  // Prettier directives in comments
  /^(?:react|solid|vue|angular)(-[a-z][-a-z0-9]*)+$/, // npm package name patterns
  // CSS property names that the scanner picks up from inline styles or CSS-in-JS.
  /^(?:z-index|font-size|font-weight|font-family|line-height|letter-spacing|text-align|text-decoration|text-transform|white-space|word-break|overflow-x|overflow-y|box-sizing|border-radius|border-collapse|border-spacing|background-color|background-image|background-size|background-position|background-repeat|object-fit|object-position|list-style|pointer-events|user-select|vertical-align|inline-size|block-size|min-width|max-width|min-height|max-height|margin-top|margin-bottom|margin-left|margin-right|padding-top|padding-bottom|padding-left|padding-right|flex-direction|flex-wrap|flex-grow|flex-shrink|flex-basis|align-items|align-self|justify-content|justify-items|grid-template|grid-column|grid-row|grid-area|grid-gap|column-gap|row-gap|transition-property|transition-duration|transition-timing|animation-name|animation-duration|transform-origin|text-overflow|will-change|touch-action|scroll-behavior|scroll-padding|overscroll-behavior|aspect-ratio|inset-inline|padding-inline|margin-inline|border-inline|inset-block|padding-block|margin-block|border-block)$/,
];

/**
 * For CSS files, only extract candidates that appear after `@apply`.
 * This avoids treating CSS property names (`background-color`, `z-index`)
 * as class candidates.
 */
function extractApplyCandidates(
  content: string,
): Array<{ candidate: string; position: number }> {
  const results: Array<{ candidate: string; position: number }> = [];
  const applyRe = /@apply\s+([^;{}\n]+)/g;
  let m: RegExpExecArray | null;
  while ((m = applyRe.exec(content)) !== null) {
    const applyList = m[1];
    // Split on whitespace; strip trailing semicolons / !important
    let offset = m.index + m[0].indexOf(m[1]);
    for (const token of applyList.split(/(\s+)/)) {
      if (/^\s+$/.test(token)) {
        offset += token.length;
        continue;
      }
      const cls = token.replace(/;$/, '').trim();
      if (cls) results.push({ candidate: cls, position: offset });
      offset += token.length;
    }
  }
  return results;
}

interface Finding {
  file: string;
  line: number;
  col: number;
  candidate: string;
  kind: 'unknown' | 'malformed';
}

/**
 * Main
 */
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
  const verbose = has('--verbose');
  const extensions = get('--extensions') ?? DEFAULT_EXTENSIONS;
  const topN = get('--top') ? parseInt(get('--top')!, 10) : Infinity;

  // Load design system
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

  // Single-class check mode
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

  // Load .twignore patterns
  const ignorePatterns = loadIgnorePatterns();
  if (ignorePatterns.length > 0) {
    console.log(`Loaded ${ignorePatterns.length} ignore pattern${ignorePatterns.length > 1 ? 's' : ''} from .twignore`);
  }

  // Extract custom CSS classes
  console.log('Extracting custom class names from ui-theme styles…');
  const customClasses = extractCustomClassNames(STYLES_DIR);
  console.log(`  ${customClasses.size} custom class names collected`);

  // Set up scanner
  const sources = filterPath
    ? [{ base: ROOT, pattern: filterPath, negated: false }]
    : buildSources(extensions);

  const scanner = new Scanner({ sources });

  const modeLabel = filterPath
    ? `--path ${filterPath}`
    : `extensions: ${extensions}`;
  console.log(`Discovering source files  [${modeLabel}]…`);
  scanner.scan(); // populate scanner.files
  const files = scanner.files;
  console.log(`  ${files.length} files to scan`);

  // Per-file candidate extraction
  // candidateOccurrences: candidate → list of {file, line, col}
  const candidateOccurrences = new Map<string, Array<{ file: string; line: number; col: number }>>();

  let scanned = 0;
  let ignoredCount = 0;
  for (const filePath of files) {
    if (SKIP_FILE_PATTERNS.some((re) => re.test(filePath))) continue;
    const relPath = path.relative(ROOT, filePath);
    if (ignorePatterns.length > 0 && isIgnored(relPath, ignorePatterns)) {
      ignoredCount++;
      continue;
    }
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }
    const ext = path.extname(filePath).slice(1) || 'txt';
    // For CSS files, only look at @apply directives — not the full file content
    // (which includes CSS property names, values, selectors, etc.)
    const withPos =
      ext === 'css'
        ? extractApplyCandidates(content)
        : scanner.getCandidatesWithPositions({ content, extension: ext });

    for (const { candidate, position } of withPos) {
      if (NOISE_PATTERN.test(candidate)) continue;
      if (hasCamelCase(candidate)) continue;
      if (!isLikelyClassCandidate(candidate)) continue;
      if (EXTRA_NOISE_PATTERNS.some((re) => re.test(candidate))) continue;
      // Filter import-path segments: `word/word` that aren't Tailwind `/` syntax.
      // Tailwind uses `/` only for opacity (bg-red-500/50) or named groups (group/name).
      if (candidate.includes('/') && !isKnownIdentifierClass(candidate) && !/\/\d+$/.test(candidate)) continue;
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

  // Batch validation
  console.log(`Validating ${candidateOccurrences.size} unique candidates…`);
  const candidateList = Array.from(candidateOccurrences.keys());
  const cssResults = ds.candidatesToCss(candidateList);

  const validTailwind = new Set<string>();
  for (let i = 0; i < candidateList.length; i++) {
    if (cssResults[i] !== null) validTailwind.add(candidateList[i]);
  }

  // Classify
  const findings: Finding[] = [];

  for (const [candidate, occurrences] of candidateOccurrences) {
    if (validTailwind.has(candidate)) continue;
    if (customClasses.has(candidate)) continue;
    if (isKnownIdentifierClass(candidate)) continue;

    const kind = isMalformed(candidate) ? 'malformed' : 'unknown';

    // Plain words without hyphens/colons/brackets are almost certainly not class
    // names (they're identifiers, prop names, or prose words picked up by the
    // scanner).  Only report them if they look structurally like a Tailwind class.
    if (kind === 'unknown' && !candidate.includes('-') && !candidate.includes(':') && !candidate.includes('[')) {
      continue;
    }

    for (const { file, line, col } of occurrences) {
      findings.push({ file, line, col, candidate, kind });
    }
  }

  // Report
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
    if (verbose) {
      let prevFile = '';
      const sorted = [...malformed].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
      for (const f of sorted) {
        if (f.file !== prevFile) {
          console.log(`  ${f.file}`);
          prevFile = f.file;
        }
        console.log(`    ${String(f.line).padStart(4)}:${String(f.col).padEnd(4)}  ${f.candidate}`);
      }
    } else {
      const uniqueMalformedClasses = [...new Set(malformed.map((f) => f.candidate))].sort();
      for (const cls of uniqueMalformedClasses) {
        console.log(`  ${cls}`);
      }
    }
  }

  // Unknown — grouped by class name, sorted alphabetically
  if (unknown.length > 0) {
    const byClass = new Map<string, Array<{ file: string; line: number; col: number }>>();
    for (const f of unknown) {
      const arr = byClass.get(f.candidate) ?? [];
      arr.push({ file: f.file, line: f.line, col: f.col });
      byClass.set(f.candidate, arr);
    }

    const sorted = Array.from(byClass.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const shown = sorted.slice(0, topN);
    const maxLen = Math.max(...shown.map(([cls]) => cls.length));

    if (verbose) {
      for (const [cls, locs] of shown) {
        console.log(`  ${cls.padEnd(maxLen)}  ${String(locs.length).padStart(4)}`);
        const shownLocs = locs.slice(0, 3);
        for (const { file, line, col } of shownLocs) {
          console.log(`    ${file}:${line}:${col}`);
        }
        if (locs.length > 3) console.log(`    … and ${locs.length - 3} more`);
      }
    } else {
      for (const [cls, locs] of shown) {
        console.log(`  ${cls.padEnd(maxLen)}  ${String(locs.length).padStart(4)}`);
      }
    }

    if (sorted.length > topN) {
      console.log(`\n  … and ${sorted.length - topN} more unique classes (use --top N to see more)`);
    } else {
      console.log(`\n🟡  UNKNOWN  (${unknown.length} occurrence${unknown.length > 1 ? 's' : ''})\n`);
    }
  }

  // Summary
  const uniqueUnknown = new Set(unknown.map((f) => f.candidate)).size;
  const uniqueMalformed = new Set(malformed.map((f) => f.candidate)).size;
  console.log(hr);
  const ignoredMsg = ignoredCount > 0 ? `, ${ignoredCount} ignored (.twignore)` : '';
  console.log(
    `\nSummary: ${uniqueMalformed} malformed classes (${malformed.length} occurrences), ` +
      `${uniqueUnknown} unknown classes (${unknown.length} occurrences)` +
      `  |  scanned ${scanned} files${ignoredMsg}, ${candidateOccurrences.size} unique candidates\n`,
  );

  if (has('--exit-code')) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
