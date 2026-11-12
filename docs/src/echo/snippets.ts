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

/** Where each app's modules sit in the project the reader builds; StackBlitz puts ECHO's and HALO's under `src/`. */
const PROJECT_PATHS: Record<string, string> = {
  '../tutorial/': 'src/',
  '../app-framework-tutorial/': '',
  '../halo-tutorial/': 'src/',
};

/** The file `file` lives in, in the reader's project; undefined for a snippet outside the apps. */
export const snippetProjectPath = (file: string): string | undefined => {
  const [path] = findSource(file);
  const root = PROJECTS.find((dir) => path.startsWith(dir));
  return root === undefined ? undefined : `${PROJECT_PATHS[root]}${path.slice(root.length)}`;
};

const REGION_MARKER = /^[ \t]*\/\/ #(end)?region.*\n/gm;

/** The docs site's stylesheet, which the embeds import and the generated projects do not have. */
const DOCS_ONLY_IMPORT = /^import '\.\.\/\.\.\/styles\/island-base\.generated\.css';\n/m;

/**
 * An app module as the reader's project has it, without the markers and directives the docs need, so its line numbers
 * are the ones a page shows.
 */
export const projectSource = (source: string): string =>
  source.replace(DOCS_ONLY_IMPORT, '').replace(REGION_MARKER, '').replace(LINT_DIRECTIVE, '');

const lineCount = (text: string) => text.split('\n').length - 1;

/** A sample from an app, numbered as the reader's file is. */
export type AppSample = {
  /** The file from its first import the shown code uses through the end of the region, or the bracket closing it. */
  code: string;
  /** The same, between the rest of the module, for twoslash to compile. */
  context: string;
  /** The file's line number of the first line shown. */
  startLine: number;
  /** The lines hidden behind a toggle, counted from the first line shown: other imports, and code outside the region. */
  collapse: [from: number, to: number][];
};

/** Each bracket pair in `lines`, by the 1-based lines of its open and close; strings and comments are skipped. */
const bracketPairs = (lines: string[]): { open: number; close: number }[] => {
  const pairs: { open: number; close: number }[] = [];
  const stack: number[] = [];
  let quote: string | undefined;
  let blockComment = false;
  lines.forEach((text, index) => {
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (blockComment) {
        if (char === '*' && text[i + 1] === '/') {
          blockComment = false;
          i++;
        }
      } else if (quote) {
        if (char === '\\') {
          i++;
        } else if (char === quote) {
          quote = undefined;
        }
      } else if (char === '/' && text[i + 1] === '/') {
        break;
      } else if (char === '/' && text[i + 1] === '*') {
        blockComment = true;
        i++;
      } else if (char === "'" || char === '"' || char === '`') {
        quote = char;
      } else if ('([{'.includes(char)) {
        stack.push(index + 1);
      } else if (')]}'.includes(char) && stack.length > 0) {
        pairs.push({ open: stack.pop()!, close: index + 1 });
      }
    }
    // Only a template literal spans lines.
    if (quote !== '`') {
      quote = undefined;
    }
  });
  return pairs;
};

/** Where `region` sits in `source`: its start marker, the body after it, and its end marker. */
const findRegion = (source: string, file: string, region?: string) => {
  const marker = new RegExp(`^[ \\t]*// #region${region ? ` ${region}` : ''}\\n`, 'm').exec(source);
  if (!marker) {
    throw new Error(`Snippet ${file} has no region ${region ?? '(default)'}`);
  }
  const bodyStart = marker.index + marker[0].length;
  // A region can hold others, so it ends at the end marker that closes no inner region.
  let depth = 0;
  const endMarker = [...source.slice(bodyStart).matchAll(/^[ \t]*\/\/ #(end)?region.*$/gm)].find((match) => {
    depth += match[1] ? -1 : 1;
    return depth < 0;
  });
  if (!endMarker) {
    throw new Error(`Snippet ${file} has no end to region ${region ?? '(default)'}`);
  }
  return { marker, bodyStart, endMarker };
};

/** `source` without `region` and without the imports only it used: the file as it is before a later page adds it. */
const omitRegion = (source: string, file: string, region: string): string => {
  const { marker, bodyStart, endMarker } = findRegion(source, file, region);
  const end = bodyStart + endMarker.index + endMarker[0].length + 1;
  const removed = source.slice(bodyStart, bodyStart + endMarker.index);
  const rest = source.slice(0, marker.index) + source.slice(end);
  const uses = (text: string, local: string) =>
    new RegExp(`(?<![\\w$.])${local.replace('$', '\\$')}(?![\\w$])`).test(text);
  const code = rest.replace(/^import [\s\S]*?;\n/gm, '');
  return rest.replace(/^import [\s\S]*?;\n/gm, (statement) =>
    parseImports(statement).every(({ bindings }) =>
      bindings.every(({ local }) => uses(removed, local) && !uses(code, local)),
    )
      ? ''
      : statement,
  );
};

/**
 * The sample for a region of an app module, from the first import the region uses: other imports and the code between
 * the imports and the region are collapsed, so every line keeps its number in the reader's file. A region that opens a
 * bracket it does not close, or closes one it did not open, also shows the lines that open and close the brackets
 * around it, with the code between them collapsed. With `omit`, a comma-separated list, the sample leaves out those regions and the
 * imports only they use, as the file is before a later page adds it. With `bare`, it shows the region alone, for a
 * file whose imports a step of their own shows. Undefined for a snippet outside the apps.
 */
export const appSample = (file: string, region?: string, omit?: string, bare = false): AppSample | undefined => {
  const [path, full] = findSource(file);
  if (!PROJECTS.some((dir) => path.startsWith(dir))) {
    return undefined;
  }
  const source = (omit?.split(/[\s,]+/) ?? []).reduce((text, name) => omitRegion(text, file, name), full);
  const { marker, bodyStart, endMarker } = findRegion(source, file, region);
  const lines = projectSource(source).split('\n');
  // The region's first and last lines, through its last non-blank line.
  const regionStart = lineCount(projectSource(source.slice(0, marker.index))) + 1;
  let regionEnd = lineCount(projectSource(source.slice(0, bodyStart + endMarker.index)));
  while (regionEnd >= regionStart && lines[regionEnd - 1].trim() === '') {
    regionEnd--;
  }
  const inRegion = (line: number) => line >= regionStart && line <= regionEnd;
  const shown = new Set<number>();
  for (let line = regionStart; line <= regionEnd; line++) {
    shown.add(line);
  }
  // The lines that open and close the brackets an unbalanced region sits in.
  const pairs = bracketPairs(lines);
  if (pairs.some(({ open, close }) => inRegion(open) !== inRegion(close))) {
    for (const { open, close } of pairs) {
      if (open < regionStart && close >= regionStart) {
        shown.add(open);
      }
      if (close > regionEnd && open <= regionEnd) {
        shown.add(close);
      }
    }
  }
  // The imports that bind a name the shown code uses.
  const body = [...shown].map((line) => lines[line - 1]).join('\n');
  const prefix = lines.slice(0, regionStart - 1).join('\n') + '\n';
  for (const match of bare ? [] : prefix.matchAll(/^import [\s\S]*?;\n/gm)) {
    const used = parseImports(match[0]).some(({ bindings }) =>
      bindings.some(({ local }) => new RegExp(`(?<![\\w$.])${local.replace('$', '\\$')}(?![\\w$])`).test(body)),
    );
    if (used) {
      const start = lineCount(prefix.slice(0, match.index)) + 1;
      for (let line = start; line < start + lineCount(match[0]); line++) {
        shown.add(line);
      }
    }
  }
  const first = Math.min(...shown);
  const end = Math.max(...shown);
  // Each run of hidden lines collapses, unless it is only blank lines.
  const collapse: [number, number][] = [];
  for (let line = first; line <= end; line++) {
    if (shown.has(line)) {
      continue;
    }
    let to = line;
    while (to + 1 <= end && !shown.has(to + 1)) {
      to++;
    }
    if (lines.slice(line - 1, to).some((text) => text.trim() !== '')) {
      collapse.push([line - first + 1, to - first + 1]);
    }
    line = to;
  }
  const code = lines.slice(first - 1, end).join('\n');
  const head = lines.slice(0, first - 1).join('\n');
  const tail = lines.slice(end).join('\n');
  const cut = `${head}${head ? '\n' : ''}// ---cut---\n${code}\n// ---cut-after---\n${tail}`;
  const root = PROJECTS.find((dir) => path.startsWith(dir))!;
  const self = path.slice(root.length);
  const files = localImports(root, self, new Set([self])).map(
    (module) => `// @filename: ${module}\n${stripRegions(readSources()[`${root}${module}`])}`,
  );
  return { code, context: compose(files, self, cut), startLine: first, collapse };
};

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

// Stylesheets and polyfills are imported for their effect, and have no types to check.
const compose = (files: string[], self: string, cut: string) =>
  [
    '// @allowImportingTsExtensions',
    '// @noEmit',
    '// @noUncheckedSideEffectImports: false',
    ...files,
    `// @filename: ${self}`,
    cut,
  ].join('\n');
