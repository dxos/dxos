//
// Copyright 2026 DXOS.org
//

// Context fetchers for the System One checker, one per context kind a rule may declare. The
// model cannot open files, so each fetcher decides what it sees: a narrow, relevant cut,
// because unrelated material costs a System One model accuracy, not just tokens.

import { existsSync, readFileSync } from 'node:fs';
import { join, normalize, posix } from 'node:path';

import { git } from '../git.ts';
import { type ContextKind } from '../mdl.ts';
import { exportedNames, exportSignatures, identifierWords, truncateText } from './source.ts';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.mjs'];
const MAX_IMPORTERS = 8;
const MAX_USES_PER_IMPORTER = 6;
const MAX_SIMILAR = 15;

// An import clause holds only names, braces, commas, `*` and `as`; allowing anything else lets an
// `export const x = f(...)` statement run on to a later `from` and read as an import.
const IMPORT_RE = /^\s*(?:import|export)\s+(?:type\s+)?([\w$\s,{}*]*?)\s*from\s*['"]([^'"]+)['"]/gm;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** A package's `exports` map entry: a target path, nested conditions, or absent. */
type PackageExportEntry = string | { [condition: string]: PackageExportEntry } | null | undefined;

export type PackageManifest = {
  name?: string;
  private?: boolean;
  main?: string;
  exports?: Record<string, PackageExportEntry>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** Loosely validates a parsed `package.json`: every field this module reads, typed by its shape. */
const isPackageManifest = (value: unknown): value is PackageManifest => {
  if (!isRecord(value)) {
    return false;
  }
  const isOptionalString = (key: string): boolean => value[key] === undefined || typeof value[key] === 'string';
  const isOptionalRecord = (key: string): boolean => value[key] === undefined || isRecord(value[key]);
  return (
    isOptionalString('name') &&
    isOptionalString('main') &&
    (value.private === undefined || typeof value.private === 'boolean') &&
    isOptionalRecord('exports') &&
    isOptionalRecord('dependencies') &&
    isOptionalRecord('devDependencies') &&
    isOptionalRecord('peerDependencies')
  );
};

export type WorkspacePackage = { dir: string; manifest: PackageManifest; path: string };

export type ImportRecord = { specifier: string; names: string[] };

export type ExportEntry = { path: string; line: number; text: string; name: string };

type Caches = {
  workspace: Map<string, WorkspacePackage> | null;
  exportIndex: { entries: ExportEntry[]; byWord: Map<string, ExportEntry[]> } | null;
  files: Map<string, string | null>;
  fetched: Map<string, string | null>;
};

/** Per-run caches: repo-wide scans are paid once however many files a run reviews. */
const caches: Caches = { workspace: null, exportIndex: null, files: new Map(), fetched: new Map() };

/** Largest cut any fetch returns; callers truncate further to their own share. */
const MAX_FETCH_CHARS = 16_000;

const readText = (root: string, path: string): string | null => {
  if (!caches.files.has(path)) {
    const absolute = join(root, path);
    caches.files.set(path, existsSync(absolute) ? readFileSync(absolute, 'utf8') : null);
  }
  return caches.files.get(path) ?? null;
};

const toPosix = (path: string): string => normalize(path).split('\\').join('/');

/** Workspace package name → { dir, manifest }, from every tracked package.json. */
const workspacePackages = (root: string): Map<string, WorkspacePackage> => {
  if (!caches.workspace) {
    const workspace = new Map<string, WorkspacePackage>();
    const paths = (git(['ls-files', '*package.json'], { allowFail: true }) ?? '').split('\n').filter(Boolean);
    for (const path of paths) {
      if (path.includes('node_modules/')) {
        continue;
      }
      const text = readText(root, path);
      if (text === null) {
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        // A malformed fixture manifest is not a workspace package; every other failure is real.
        if (error instanceof SyntaxError) {
          continue;
        }
        throw error;
      }
      if (isPackageManifest(parsed) && parsed.name) {
        workspace.set(parsed.name, { dir: posix.dirname(path), manifest: parsed, path });
      }
    }
    caches.workspace = workspace;
  }
  return caches.workspace;
};

/** Source file an `exports` entry points at, preferring the `source` condition. */
const exportTarget = (entry: PackageExportEntry): string | null => {
  if (typeof entry === 'string') {
    return entry;
  }
  if (entry && typeof entry === 'object') {
    for (const key of ['source', 'import', 'default', 'types']) {
      const target = exportTarget(entry[key]);
      if (target) {
        return target;
      }
    }
  }
  return null;
};

const firstExisting = (root: string, candidates: readonly string[]): string | null =>
  candidates.find((candidate) => readText(root, candidate) !== null) ?? null;

/** Resolve an import specifier from `fromFile` to a repo-relative source path, or null. */
export const resolveImport = (root: string, fromFile: string, specifier: string): string | null => {
  if (specifier.startsWith('.')) {
    const base = toPosix(posix.join(posix.dirname(fromFile), specifier));
    const stem = base.replace(/\.(js|mjs)$/, '');
    return firstExisting(root, [
      base,
      ...SOURCE_EXTENSIONS.map((extension) => `${stem}${extension}`),
      ...SOURCE_EXTENSIONS.map((extension) => `${base}/index${extension}`),
    ]);
  }
  const match = specifier.match(/^(@[^/]+\/[^/]+|[^@/][^/]*)(?:\/(.+))?$/);
  const pkg = match && workspacePackages(root).get(match[1]);
  if (!pkg) {
    return null;
  }
  const subpath = match?.[2] ? `./${match[2]}` : '.';
  const target = exportTarget(pkg.manifest.exports?.[subpath]);
  const candidates = target ? [posix.join(pkg.dir, target)] : [];
  candidates.push(
    ...SOURCE_EXTENSIONS.map((extension) => posix.join(pkg.dir, 'src', `${match?.[2] ?? 'index'}${extension}`)),
  );
  return firstExisting(root, candidates.map(toPosix));
};

/** `{ specifier, names }` for every import and re-export in a module. */
export const parseImports = (text: string): ImportRecord[] => {
  const imports: ImportRecord[] = [];
  for (const match of text.matchAll(IMPORT_RE)) {
    const clause = match[1];
    const names: string[] = [];
    const braces = clause.match(/\{([\s\S]*)\}/)?.[1];
    if (braces) {
      for (const part of braces.split(',')) {
        const local = part
          .replace(/^\s*type\s+/, '')
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
        if (local) {
          names.push(local);
        }
      }
    }
    const namespace = clause.match(/\*\s+as\s+([\w$]+)/)?.[1];
    if (namespace) {
      names.push(namespace);
    }
    const defaultName = clause.match(/^([\w$]+)\s*(?:,|$)/)?.[1];
    if (defaultName && defaultName !== 'type') {
      names.push(defaultName);
    }
    imports.push({ specifier: match[2], names: names.filter((name) => /^[\w$]+$/.test(name)) });
  }
  return imports;
};

const nearestManifest = (
  root: string,
  file: string,
): { dir: string; path: string; manifest: PackageManifest } | null => {
  for (let dir = posix.dirname(file); dir && dir !== '.'; dir = posix.dirname(dir)) {
    const path = `${dir}/package.json`;
    const text = readText(root, path);
    if (text) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        if (error instanceof SyntaxError) {
          continue;
        }
        throw error;
      }
      if (isPackageManifest(parsed)) {
        return { dir, path, manifest: parsed };
      }
    }
    if (!dir.includes('/')) {
      break;
    }
  }
  return null;
};

/** Fetcher input: enough to locate the file and cap what a fetch returns. */
export type ContextFetchOptions = {
  root: string;
  file: string;
  base: string | null;
  maxChars: number;
};

type Fetcher = (options: ContextFetchOptions) => string | null;

//
// Fetchers. Each returns text sized to `maxChars`, or null when the kind has nothing to say.
//

const fetchDiff: Fetcher = ({ root, file, base, maxChars }) => {
  if (!base) {
    return null;
  }
  const tracked = git(['ls-files', '--error-unmatch', file], { allowFail: true });
  if (tracked === null) {
    return readText(root, file) === null ? null : '(new file: every line is added in this change)';
  }
  const diff = git(['diff', '-U3', base, '--', file], { allowFail: true });
  return diff ? truncateText(diff, maxChars) : '(no changes to this file in the reviewed range)';
};

const fetchImports: Fetcher = ({ root, file, maxChars }) => {
  const text = readText(root, file);
  const blocks: string[] = [];
  const seen = new Set<string>();
  for (const { specifier } of parseImports(text ?? '')) {
    const target = resolveImport(root, file, specifier);
    if (!target || target === file || seen.has(target)) {
      continue;
    }
    seen.add(target);
    const signatures = exportSignatures(readText(root, target) ?? '');
    if (signatures.length > 0) {
      blocks.push(`// ${specifier} (${target})\n${signatures.slice(0, 40).join('\n')}`);
    }
  }
  return blocks.length ? truncateText(blocks.join('\n\n'), maxChars) : null;
};

/** Import specifiers other modules would use to reach `file`. */
const reachingSpecifierPattern = (root: string, file: string): string => {
  const stem = posix.basename(file).replace(/\.[^.]+$/, '');
  const name = stem === 'index' ? posix.basename(posix.dirname(file)) : stem;
  const patterns = [`['"][^'"]*/${name}(/index)?(\\.[mc]?[jt]sx?)?['"]`];
  const pkg = nearestManifest(root, file);
  if (pkg?.manifest.name) {
    const exportsMap: Record<string, PackageExportEntry> = pkg.manifest.exports ?? { '.': pkg.manifest.main };
    for (const [subpath, entry] of Object.entries(exportsMap)) {
      const target = exportTarget(entry);
      if (target && toPosix(posix.join(pkg.dir, target)) === file) {
        const specifier = subpath === '.' ? pkg.manifest.name : `${pkg.manifest.name}/${subpath.slice(2)}`;
        patterns.push(`['"]${escapeRegExp(specifier)}['"]`);
      }
    }
  }
  return `from\\s*(${patterns.join('|')})`;
};

const fetchImporters: Fetcher = ({ root, file, maxChars }) => {
  const out = git(
    [
      'grep',
      '-l',
      '-E',
      reachingSpecifierPattern(root, file),
      '--',
      ':(glob)packages/**/*.ts',
      ':(glob)packages/**/*.tsx',
    ],
    {
      allowFail: true,
    },
  );
  const importers: string[] = [];
  for (const candidate of (out ?? '').split('\n').filter(Boolean)) {
    if (candidate === file || importers.length >= MAX_IMPORTERS) {
      continue;
    }
    const text = readText(root, candidate) ?? '';
    const hits = parseImports(text).filter(({ specifier }) => resolveImport(root, candidate, specifier) === file);
    if (hits.length === 0) {
      continue;
    }
    const names = hits.flatMap(({ names: importedNames }) => importedNames);
    const lines = text.split('\n');
    const uses: string[] = [];
    for (let index = 0; index < lines.length && uses.length < MAX_USES_PER_IMPORTER; index++) {
      const line = lines[index];
      if (
        !/^\s*import\b/.test(line) &&
        names.some((name) => new RegExp(`(^|[^\\w$])${escapeRegExp(name)}($|[^\\w$])`).test(line))
      ) {
        uses.push(`${index + 1}: ${line.trim().slice(0, 160)}`);
      }
    }
    importers.push(`// ${candidate} imports ${names.join(', ') || '(side effects)'}\n${uses.join('\n')}`);
  }
  return importers.length ? truncateText(importers.join('\n\n'), maxChars) : null;
};

const fetchSiblings: Fetcher = ({ root, file, maxChars }) => {
  const dir = posix.dirname(file);
  const out = git(['ls-files', '--', `${dir}/`], { allowFail: true }) ?? '';
  const siblings = out
    .split('\n')
    .filter((path) => path && path !== file && posix.dirname(path) === dir)
    .map((path) => {
      const names = /\.[mc]?[jt]sx?$/.test(path) ? exportedNames(readText(root, path) ?? '') : [];
      return `${posix.basename(path)}${names.length ? `: ${names.slice(0, 12).join(', ')}` : ''}`;
    });
  return siblings.length ? truncateText(siblings.join('\n'), maxChars) : null;
};

const fetchPackage: Fetcher = ({ root, file, maxChars }) => {
  const pkg = nearestManifest(root, file);
  if (!pkg) {
    return null;
  }
  const workspace = workspacePackages(root);
  const describe = (field: 'dependencies' | 'devDependencies' | 'peerDependencies'): string[] =>
    Object.keys(pkg.manifest[field] ?? {})
      .filter((name) => workspace.has(name))
      .sort();
  const layer = pkg.dir.split('/').slice(1, -1).join('/') || pkg.dir;
  const lines = [
    `name: ${pkg.manifest.name}`,
    `path: ${pkg.dir}`,
    `layer: ${layer}`,
    `private: ${pkg.manifest.private === true}`,
    `workspace dependencies: ${describe('dependencies').join(', ') || '(none)'}`,
    `workspace devDependencies: ${describe('devDependencies').join(', ') || '(none)'}`,
    `workspace peerDependencies: ${describe('peerDependencies').join(', ') || '(none)'}`,
  ];
  return truncateText(lines.join('\n'), maxChars);
};

const fetchPublicApi: Fetcher = ({ root, file, maxChars }) => {
  const pkg = nearestManifest(root, file);
  if (!pkg) {
    return null;
  }
  const exportsMap = pkg.manifest.exports ?? {};
  const entry = exportTarget(exportsMap['.']) ?? pkg.manifest.main ?? 'src/index.ts';
  const barrelPath = toPosix(posix.join(pkg.dir, entry));
  const barrel = readText(root, barrelPath);
  const subpaths = Object.keys(exportsMap).filter((key) => key !== '.' && key !== './package.json');
  const text = [
    `package: ${pkg.manifest.name}`,
    `exported subpaths: ${subpaths.join(', ') || '(none)'}`,
    `entry barrel (${barrelPath}):`,
    barrel ?? '(missing)',
  ].join('\n');
  return truncateText(text, maxChars);
};

/** Every exported declaration under `packages/`, indexed by name and by name word. */
const exportIndex = (): { entries: ExportEntry[]; byWord: Map<string, ExportEntry[]> } => {
  if (!caches.exportIndex) {
    const out =
      git(
        [
          'grep',
          '-n',
          '-E',
          '^export (declare )?(default )?(async )?(function|class|interface|type|enum|const|let|namespace) [A-Za-z_$][A-Za-z0-9_$]*',
          '--',
          ':(glob)packages/**/src/**/*.ts',
          ':(glob)packages/**/src/**/*.tsx',
          ':(exclude,glob)**/*.test.ts',
          ':(exclude,glob)**/*.test.tsx',
          ':(exclude,glob)**/*.stories.tsx',
        ],
        { allowFail: true },
      ) ?? '';
    const byWord = new Map<string, ExportEntry[]>();
    const entries: ExportEntry[] = [];
    for (const row of out.split('\n')) {
      const match = row.match(/^([^:]+):(\d+):(.*)$/);
      const name = match?.[3].match(/\s([A-Za-z_$][\w$]*)\s*(?:[=:<({]|extends|implements|$)/)?.[1];
      if (!match || !name) {
        continue;
      }
      const entry: ExportEntry = { path: match[1], line: Number(match[2]), text: match[3].trim().slice(0, 160), name };
      entries.push(entry);
      for (const word of new Set(identifierWords(name))) {
        if (!byWord.has(word)) {
          byWord.set(word, []);
        }
        byWord.get(word)?.push(entry);
      }
    }
    caches.exportIndex = { entries, byWord };
  }
  return caches.exportIndex;
};

const fetchSimilar: Fetcher = ({ root, file, base, maxChars }) => {
  const text = readText(root, file) ?? '';
  let names = exportedNames(text);
  if (base) {
    // Only what this change adds can be a new parallel mechanism; untouched exports are not the question.
    const diff = git(['diff', '-U0', base, '--', file], { allowFail: true }) ?? '';
    const added = exportedNames(
      diff
        .split('\n')
        .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
        .map((line) => line.slice(1))
        .join('\n'),
    );
    if (added.length > 0 || diff) {
      names = added;
    }
  }
  if (names.length === 0) {
    return null;
  }
  const { byWord } = exportIndex();
  const stem = file.replace(/\.[^.]+$/, '');
  const scored = new Map<ExportEntry, { score: number; for: string }>();
  for (const name of names) {
    const words = new Set(identifierWords(name));
    const counts = new Map<ExportEntry, number>();
    for (const word of words) {
      for (const entry of byWord.get(word) ?? []) {
        if (entry.path === file || entry.path.startsWith(`${stem}.`)) {
          continue;
        }
        counts.set(entry, (counts.get(entry) ?? 0) + 1);
      }
    }
    for (const [entry, shared] of counts) {
      const needed = Math.min(2, words.size);
      if (shared >= needed || entry.name === name) {
        const score = shared / new Set(identifierWords(entry.name)).size + (entry.name === name ? 1 : 0);
        const previous = scored.get(entry);
        if (!previous || previous.score < score) {
          scored.set(entry, { score, for: name });
        }
      }
    }
  }
  const top = [...scored.entries()].sort((left, right) => right[1].score - left[1].score).slice(0, MAX_SIMILAR);
  if (top.length === 0) {
    return `(no existing exports share words with: ${names.join(', ')})`;
  }
  const lines = top.map(([entry, { for: name }]) => `${entry.path}:${entry.line}: ${entry.text}   [cf. ${name}]`);
  return truncateText(`exports under review: ${names.join(', ')}\n${lines.join('\n')}`, maxChars);
};

const fetchTest: Fetcher = ({ root, file, maxChars }) => {
  const isTest = /\.(test|spec)\.[mc]?[jt]sx?$/.test(file);
  const candidates = isTest
    ? SOURCE_EXTENSIONS.map((extension) => file.replace(/\.(test|spec)\.[mc]?[jt]sx?$/, extension))
    : ['test', 'browser.test', 'node.test'].flatMap((infix) =>
        ['.ts', '.tsx'].map((extension) => file.replace(/\.[mc]?[jt]sx?$/, `.${infix}${extension}`)),
      );
  const found = firstExisting(root, candidates);
  if (!found) {
    return null;
  }
  return truncateText(`// ${found}\n${readText(root, found)}`, maxChars);
};

const fetchPr: Fetcher = ({ base, maxChars }) => {
  if (!base) {
    return null;
  }
  const log = (git(['log', '--format=- %s%n%b', `${base}..HEAD`], { allowFail: true }) ?? '')
    .split('\n')
    // Trailers say who wrote a commit, not what it is for.
    .filter((line) => !/^[A-Z][\w-]+: /.test(line))
    .join('\n');
  const stat = git(['diff', '--stat=120', base], { allowFail: true }) ?? '';
  return truncateText(`commits:\n${log.trim() || '(none)'}\n\nchanged files:\n${stat}`, maxChars);
};

const FETCHERS: Record<ContextKind, Fetcher> = {
  'diff': fetchDiff,
  'imports': fetchImports,
  'importers': fetchImporters,
  'siblings': fetchSiblings,
  'package': fetchPackage,
  'public-api': fetchPublicApi,
  'similar': fetchSimilar,
  'test': fetchTest,
  'pr': fetchPr,
};

/**
 * Fetch one context kind for a file.
 *
 * @param kind A key of `CONTEXT_KINDS`.
 */
export const fetchContext = (kind: ContextKind, options: ContextFetchOptions): string | null => {
  const fetcher = FETCHERS[kind];
  if (!fetcher) {
    throw new Error(`no fetcher for context kind ${JSON.stringify(kind)}`);
  }
  // One file is planned once per context group and round, so each kind is fetched once per file.
  const key = `${kind}\u0000${options.file}\u0000${options.base ?? ''}`;
  if (!caches.fetched.has(key)) {
    caches.fetched.set(key, fetcher({ ...options, maxChars: MAX_FETCH_CHARS }));
  }
  const text = caches.fetched.get(key) ?? null;
  return text === null ? null : truncateText(text, options.maxChars);
};
