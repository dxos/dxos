//
// Copyright 2026 DXOS.org
//

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Directories whose `.ts` and `.tsx` files are quoted, relative to this module. They are read from disk, not imported:
 * in dev, Astro walks a page's imports for its CSS and follows a `?raw` import into the module's own graph, so a page
 * quoting the tutorial app would compile the whole app before it renders.
 */
const SOURCE_DIRS = [
  './snippets/',
  // The tutorial app's own modules, quoted where a page builds that piece of it.
  '../tutorial/',
  // The Composer learning path's plugin, quoted the same way.
  '../app-framework-tutorial/',
  // HALO's contact book, quoted the same way.
  '../halo-tutorial/',
];

const ECHO_DIR = join(process.cwd(), 'src/echo');

const cache = new Map<string, { mtime: number; source: string }>();

/** The quoted sources by their path relative to this module; a file is read again when it changes. */
const readSources = (): Record<string, string> =>
  Object.fromEntries(
    SOURCE_DIRS.flatMap((dir) =>
      readdirSync(join(ECHO_DIR, dir), { recursive: true, encoding: 'utf8' })
        .filter((file) => /\.tsx?$/.test(file))
        .map((file) => {
          const key = `${dir}${file}`;
          const path = join(ECHO_DIR, key);
          const mtime = statSync(path).mtimeMs;
          let entry = cache.get(path);
          if (entry?.mtime !== mtime) {
            entry = { mtime, source: readFileSync(path, 'utf8') };
            cache.set(path, entry);
          }
          return [key, entry.source];
        }),
    ),
  );

/** Directories whose modules compile with their local imports beside them. */
const PROJECTS = ['../tutorial/', '../app-framework-tutorial/', '../halo-tutorial/'];

const findSource = (file: string): [path: string, source: string] => {
  const entry = Object.entries(readSources()).find(([path]) => path.match(new RegExp(`/${file}\\.tsx?$`)));
  if (!entry) {
    throw new Error(`Unknown snippet: ${file}`);
  }
  return entry;
};

const stripRegions = (source: string) => source.replace(/^\/\/ #(end)?region.*$/gm, '');

/** Joins a relative import onto the importing file's directory: `('app/Form.tsx', '../schema.ts')` is `schema.ts`. */
const resolve = (from: string, specifier: string): string => {
  const parts = from.split('/').slice(0, -1);
  for (const segment of specifier.split('/')) {
    if (segment === '..') {
      parts.pop();
    } else if (segment !== '.') {
      parts.push(segment);
    }
  }
  return parts.join('/');
};

/**
 * The local modules `path` imports, statically or through a dynamic `import()`, dependencies first, as paths under
 * the project directory `root`. A snippet from a project is compiled with these beside it, so its imports resolve the
 * way they do in the project.
 */
const localImports = (root: string, path: string, seen = new Set<string>()): string[] => {
  const sources = readSources();
  const source = sources[`${root}${path}`];
  if (typeof source !== 'string') {
    throw new Error(`Unknown project module: ${root}${path}`);
  }
  const order: string[] = [];
  for (const [, specifier] of source.matchAll(/(?:from |import\()'(\.{1,2}\/[^']+)'/g)) {
    const target = resolve(path, specifier);
    if (!target.startsWith('..') && !seen.has(target) && sources[`${root}${target}`] !== undefined) {
      seen.add(target);
      order.push(...localImports(root, target, seen), target);
    }
  }
  return order;
};

/** Lint directives configure the repo's checks, not the reader's code. */
const LINT_DIRECTIVE = /^[ \t]*\/\/ (eslint|oxlint)-disable.*\n/gm;

/** Returns a snippet's visible code: one `// #region` if named, else every region, else the whole file past its imports. */
export const snippetSource = (file: string, region?: string): string => {
  const [, source] = findSource(file);
  const pattern = region
    ? new RegExp(`// #region ${region}\\n([\\s\\S]*?)// #endregion`)
    : /\/\/ #region\n([\s\S]*?)\/\/ #endregion/;
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  return match[1].replace(LINT_DIRECTIVE, '').trimEnd();
};

/**
 * The snippet with the code around its region cut, so a compiler sees the whole module while the page shows only the
 * region. A region inside a component body needs the code after it to close.
 */
export const snippetWithContext = (file: string, region?: string): string => {
  const [path, source] = findSource(file);
  const marker = region ? `// #region ${region}\n` : '// #region\n';
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  const end = source.indexOf('// #endregion', start);
  const before = stripRegions(source.slice(0, start));
  const after = stripRegions(source.slice(source.indexOf('\n', end) + 1));
  const cut = `${before}// ---cut---\n${snippetSource(file, region)}\n// ---cut-after---\n${after}`;
  const root = PROJECTS.find((project) => path.startsWith(project));
  if (!root) {
    return cut;
  }

  // Each module the snippet imports goes in as a file of its own, ahead of the snippet's.
  const self = path.slice(root.length);
  const seen = new Set([self]);
  const files = localImports(root, self, seen).map(
    (module) => `// @filename: ${module}\n${stripRegions(readSources()[`${root}${module}`])}`,
  );
  return ['// @allowImportingTsExtensions', '// @noEmit', ...files, `// @filename: ${self}`, cut].join('\n');
};
