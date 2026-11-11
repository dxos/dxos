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

const regionCode = (source: string, file: string, region?: string): string => {
  const pattern = region
    ? new RegExp(`// #region ${region}\\n([\\s\\S]*?)// #endregion`)
    : /\/\/ #region\n([\s\S]*?)\/\/ #endregion/;
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  return match[1].replace(LINT_DIRECTIVE, '').trimEnd();
};

/** One name an import declaration binds, with the text that binds it (`type Foo`, `Bar as Baz`, `* as Effect`). */
type Binding = { local: string; text: string; kind: 'default' | 'namespace' | 'named' };

type ImportDeclaration = { text: string; module: string; typeOnly: boolean; bindings: Binding[] };

const IMPORT = /^import\s+(type\s+)?([^;'"]*?)\s+from\s+'([^']+)';\n/gm;

const parseImports = (source: string): ImportDeclaration[] =>
  [...source.matchAll(IMPORT)].map(([text, typeOnly, clause, module]) => {
    const bindings: Binding[] = [];
    const braces = clause.match(/\{([\s\S]*)\}/);
    const head = clause
      .replace(/\{[\s\S]*\}/, '')
      .replace(/,\s*$/, '')
      .trim();
    const namespace = head.match(/^\*\s+as\s+(\w+)$/);
    if (namespace) {
      bindings.push({ local: namespace[1], text: head, kind: 'namespace' });
    } else if (head) {
      bindings.push({ local: head, text: head, kind: 'default' });
    }
    for (const specifier of braces?.[1].split(',') ?? []) {
      const text = specifier.trim().replace(/\s+/g, ' ');
      if (text) {
        bindings.push({ local: text.split(' ').at(-1)!, text, kind: 'named' });
      }
    }
    return { text, module, typeOnly: Boolean(typeOnly), bindings };
  });

const printImport = ({ module, typeOnly }: ImportDeclaration, bindings: Binding[]): string => {
  const head = bindings.find((binding) => binding.kind !== 'named');
  const named = bindings.filter((binding) => binding.kind === 'named').map((binding) => binding.text);
  const clause = [head?.text, named.length > 0 ? `{ ${named.join(', ')} }` : undefined].filter(Boolean).join(', ');
  return `import ${typeOnly ? 'type ' : ''}${clause} from '${module}';`;
};

/**
 * Splits a file's imports into the ones `code` uses and the rest, so a snippet can show where each name it uses comes
 * from. A region that starts indented continues code the page showed earlier, so it shows none.
 */
const splitImports = (source: string, code: string): { shown: string[]; hidden: string[] } => {
  const shown: string[] = [];
  const hidden: string[] = [];
  const quoted = /^\S/.test(code);
  for (const declaration of parseImports(source)) {
    const used = declaration.bindings.filter(
      (binding) => quoted && new RegExp(`(?<![\\w$.])${binding.local.replace('$', '\\$')}(?![\\w$])`).test(code),
    );
    const unused = declaration.bindings.filter((binding) => !used.includes(binding));
    if (used.length > 0) {
      shown.push(printImport(declaration, used));
    }
    if (unused.length > 0) {
      hidden.push(printImport(declaration, unused));
    }
  }
  return { shown, hidden };
};

/**
 * Returns a snippet's visible code: one `// #region` if named, else the file's unnamed region, headed by the imports
 * that code uses.
 */
/** A shared snippet imports a project's module by its path from `snippets/`. */
const PROJECT_IMPORT = /'\.\.\/\.\.\/((?:app-framework-|halo-)?tutorial)\/([^']+)'/g;

/** The snippet with each project module imported as a sibling, which is how the page shows it and how it compiles. */
const localize = (source: string) => source.replace(PROJECT_IMPORT, "'./$2'");

export const snippetSource = (file: string, region?: string): string => {
  const source = localize(findSource(file)[1]);
  const code = regionCode(source, file, region);
  const { shown } = splitImports(source, code);
  return shown.length > 0 ? `${shown.join('\n')}\n\n${code}` : code;
};

/**
 * The snippet with the code around its region cut, so a compiler sees the whole module while the page shows only the
 * region. A region inside a component body needs the code after it to close.
 */
export const snippetWithContext = (file: string, region?: string): string => {
  const [path, original] = findSource(file);
  const source = localize(original);
  const marker = region ? `// #region ${region}\n` : '// #region\n';
  const start = source.indexOf(marker);
  if (start < 0) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  const end = source.indexOf('// #endregion', start);
  // The imports the snippet shows move below the cut; the rest stay above it.
  const { hidden } = splitImports(source, regionCode(source, file, region));
  const before = [...hidden, stripRegions(source.slice(0, start)).replace(IMPORT, '')].join('\n');
  const after = stripRegions(source.slice(source.indexOf('\n', end) + 1));
  const cut = `${before}// ---cut---\n${snippetSource(file, region)}\n// ---cut-after---\n${after}`;
  const project = PROJECTS.find((project) => path.startsWith(project));
  if (project) {
    // Each module the snippet imports goes in as a file of its own, ahead of the snippet's.
    const self = path.slice(project.length);
    const files = localImports(project, self, new Set([self])).map(
      (module) => `// @filename: ${module}\n${stripRegions(readSources()[`${project}${module}`])}`,
    );
    return compose(files, self, cut);
  }

  // A shared snippet compiles beside the shared snippets it imports and the project modules they import.
  const dir = path.slice(0, path.lastIndexOf('/') + 1);
  const self = path.slice(dir.length);
  const siblings = localImports(dir, self, new Set([self]));
  const sources = [original, ...siblings.map((module) => readSources()[`${dir}${module}`])];
  const shared = sources.flatMap((source) => [...source.matchAll(PROJECT_IMPORT)]);
  if (shared.length === 0 && siblings.length === 0) {
    return cut;
  }
  const seen = new Set<string>();
  const files = shared.flatMap(([, name, module]) => {
    const root = `../${name}/`;
    if (seen.has(module)) {
      return [];
    }
    seen.add(module);
    return [...localImports(root, module, seen), module].map(
      (module) => `// @filename: ${module}\n${stripRegions(readSources()[`${root}${module}`])}`,
    );
  });
  files.push(
    ...siblings.map((module) => `// @filename: ${module}\n${localize(stripRegions(readSources()[`${dir}${module}`]))}`),
  );
  return compose(files, self, cut);
};

const compose = (files: string[], self: string, cut: string) =>
  ['// @allowImportingTsExtensions', '// @noEmit', ...files, `// @filename: ${self}`, cut].join('\n');
