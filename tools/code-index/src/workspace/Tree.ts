//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { basename, join, normalize } from 'node:path';

import * as Ontology from '../Ontology.ts';
import type * as Store from '../Store.ts';
import * as Protocol from './Protocol.ts';

/**
 * The repository as one tree: directories from the repository root down to each package, then the
 * package's public surface — its entrypoints, what each one exports, and, under a namespace export,
 * the members of the module it stands for.
 *
 * Nodes are addressed by string ids the client hands back to ask for their children, so the tree
 * is walked lazily: a request names the branches it needs and gets back their children, never
 * anything deeper. Every id kind resolves with a fixed query batched over all requested ids.
 */

export const REPO = 'repo:';
export const DIR = 'dir:';
export const PACKAGE = 'pkg:';
/** A folder inside a package's `src`, by its repository-relative path. */
export const FOLDER = 'src:';
export const MODULE = 'mod:';
export const SYMBOL = 'sym:';

export const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

/** An IRI the store minted; anything else in a request is dropped rather than spliced into SPARQL. */
const INVALID_IRI = /[<>"{}|^`\\\s]/;
export const isIndexIri = (iri: string): boolean => iri.startsWith(Ontology.IRI_BASE) && !INVALID_IRI.test(iri);
export const values = (iris: readonly string[]): string => iris.map((iri) => `<${iri}>`).join(' ');

/** A SPARQL string literal; JSON's escapes are a subset of SPARQL's. */
export const literal = (value: string): string => JSON.stringify(value);

const byLabel = (left: Protocol.TreeNode, right: Protocol.TreeNode): number =>
  Number(right.branch) - Number(left.branch) || left.label.localeCompare(right.label, 'en', { sensitivity: 'base' });

type Package = { readonly iri: string; readonly name: string; readonly path: string };

const PACKAGES = `${DEUS}
SELECT ?pkg ?name ?path WHERE { ?pkg a deus:Package ; deus:name ?name ; deus:packagePath ?path . FILTER(?path != "") }`;

const entriesQuery = (packages: readonly string[]) => `${DEUS}
SELECT ?pkg ?file ?path WHERE {
  VALUES ?pkg { ${values(packages)} }
  ?pkg deus:entry ?file . ?file deus:path ?path .
}`;

/** Tests and stories are not part of what a package is made of, so the source tree leaves them out. */
const NOT_TEST = `FILTER(!REGEX(?path, "\\\\.(test|stories|spec)\\\\.tsx?$"))`;

// Every TypeScript module below a folder, at any depth; the folder's own rows are derived from the paths.
const sourceFilesQuery = (folder: string) => `${DEUS}
SELECT ?file ?path WHERE {
  ?file deus:path ?path ; deus:language "typescript" .
  FILTER(STRSTARTS(?path, ${literal(`${folder}/`)}))
  ${NOT_TEST}
}`;

const hasSourcesQuery = (pkg: Package) => `${DEUS}
ASK {
  ?file deus:inPackage <${pkg.iri}> ; deus:path ?path ; deus:language "typescript" .
  FILTER(STRSTARTS(?path, ${literal(`${pkg.path}/src/`)}))
  ${NOT_TEST}
}`;

const fileQuery = (file: string) => `${DEUS}
SELECT ?path ?pkg WHERE { <${file}> deus:path ?path . OPTIONAL { <${file}> deus:inPackage ?pkg } } LIMIT 1`;

const entryQuery = (pkg: string, file: string) => `${DEUS}
ASK { <${pkg}> deus:entry <${file}> }`;

const declarationQuery = (symbol: string) => `${DEUS}
SELECT ?file ?exported WHERE { ?file deus:declares <${symbol}> . OPTIONAL { <${symbol}> deus:exported ?exported } } LIMIT 1`;

/**
 * Which entry of its package exposes a symbol, and how: declared by the entry itself, behind a
 * namespace the entry exports, or through a chain of `export *`. The tree shows a symbol under the
 * entry that reaches it, so its path goes through one of these.
 */
const exposureQuery = (symbol: string) => `${DEUS}
SELECT ?entry ?namespace ?via WHERE {
  ?file deus:declares <${symbol}> ; deus:inPackage ?pkg .
  ?pkg deus:entry ?entry .
  {
    ?entry deus:declares <${symbol}> . BIND("direct" AS ?via)
  } UNION {
    ?entry deus:declares ?namespace . ?namespace deus:namespaceOf ?file . BIND("namespace" AS ?via)
  } UNION {
    ?entry deus:reexports+ ?file . BIND("star" AS ?via)
  }
}`;

const VIA_RANK: Record<string, number> = { direct: 0, star: 1, namespace: 2 };

/** Every manifest exports its own `package.json`; as a tree row it is noise, and the package's card already shows it. */
const isManifest = (path: string): boolean => path.endsWith('/package.json');

// A named re-export takes the kind of what it resolves to, so `export { DXN } from` reads as the class it is.
const exportsQuery = (modules: readonly string[]) => `${DEUS}
SELECT ?module ?symbol ?name ?declKind ?realKind ?target ?snippet ?members ?typeTerm ?realTypeTerm ?realSnippet ?defaultExport WHERE {
  VALUES ?module { ${values(modules)} }
  ?module deus:declares ?symbol .
  ?symbol deus:exported true ; deus:name ?name ; deus:kind ?declKind .
  OPTIONAL {
    ?symbol deus:resolvesTo ?real . ?real deus:kind ?realKind .
    OPTIONAL { ?real deus:typeTerm ?realTypeTerm }
    OPTIONAL { ?real deus:snippet ?realSnippet }
  }
  OPTIONAL { ?symbol deus:namespaceOf ?target }
  OPTIONAL { ?symbol deus:snippet ?snippet }
  OPTIONAL { ?symbol deus:members ?members }
  OPTIONAL { ?symbol deus:typeTerm ?typeTerm }
  OPTIONAL { ?symbol deus:defaultExport ?defaultExport }
}`;

/** A row's semantic kind, from the declaration a re-export resolves to when it does. */
const rowKind = (row: Store.Binding): string =>
  semanticKind({
    kind: row.declKind ?? row.kind,
    realKind: row.realKind,
    typeTerm: row.realTypeTerm ?? row.typeTerm,
    snippet: row.realSnippet ?? row.snippet,
  });

const membersQuery = (symbols: readonly string[]) => `${DEUS}
SELECT ?symbol ?members WHERE { VALUES ?symbol { ${values(symbols)} } ?symbol deus:members ?members }`;

/** A member of a class, interface or object type, by its owner and name (`static ` first for a static one). */
export const MEMBER = 'mem:';

const memberKey = (member: Ontology.MemberFact): string => `${member.static === true ? 'static ' : ''}${member.name}`;

const memberId = (symbol: string, member: Ontology.MemberFact): string => `${MEMBER}${symbol}|${memberKey(member)}`;

/** The members a symbol's `deus:members` literal lists; a literal that does not decode lists none. */
const parseMembers = (literal: string | undefined): Ontology.MemberFact[] => {
  if (!literal) {
    return [];
  }
  try {
    return Schema.decodeUnknownSync(Schema.Array(Ontology.MemberFact))(JSON.parse(literal)).slice();
  } catch {
    return [];
  }
};

const memberNodes = (symbol: string, literal: string | undefined): Protocol.TreeNode[] =>
  parseMembers(literal).map(
    (member) =>
      new Protocol.TreeNode({
        id: memberId(symbol, member),
        label: member.static === true ? `static ${member.name}` : member.name,
        kind: 'member',
        branch: false,
        detail: member.kind,
      }),
  );

/** A value whose initializer is a function: `= (…) =>`, `= async x =>`, `= function`. */
const FUNCTION_INITIALIZER =
  /=\s*(?:async\s+)?(?:function\b|(?:<[^>]*>\s*)?\([^)]*\)\s*(?::[^=]*)?=>|[A-Za-z_$][\w$]*\s*=>)/;

/**
 * What a declaration is, which is what the tree and the palette label and draw it by: a `const` holding
 * a function is a function. Its inferred type says so (`deus:typeTerm`'s kind); where inference gave up,
 * the declaring statement still shows a function initializer. Anything else keeps the kind it was
 * declared as, a named re-export the kind of what it resolves to.
 */
export const semanticKind = (row: {
  readonly kind: string;
  readonly realKind?: string;
  readonly typeTerm?: string;
  readonly snippet?: string;
}): string => {
  const kind = row.realKind ?? row.kind;
  if (kind !== 'variable') {
    return kind;
  }
  const typeKind = row.typeTerm ? /^\{"k":"(\w+)"/.exec(row.typeTerm)?.[1] : undefined;
  if (typeKind === 'function') {
    return 'function';
  }
  return (typeKind === undefined || typeKind === 'unresolved') && FUNCTION_INITIALIZER.test(row.snippet ?? '')
    ? 'function'
    : kind;
};

/** Whether an export is its module's default: the parser marks it, since `export default class X` is named `X`. */
const isDefaultExport = (row: Store.Binding): boolean => row.defaultExport === 'true';

// `reexports` is one edge for every `export … from`; only a bare `export *` is not already a declared symbol.
const starsQuery = (modules: readonly string[]) => `${DEUS}
SELECT ?module ?target WHERE {
  VALUES ?module { ${values(modules)} }
  ?module deus:reexports ?target .
  FILTER NOT EXISTS { ?module deus:declares ?namespace . ?namespace deus:namespaceOf ?target }
  FILTER NOT EXISTS {
    ?module deus:declares ?named . ?named deus:kind "reexport" ; deus:aliasOf ?origin .
    FILTER(STRSTARTS(STR(?origin), CONCAT(STR(?target), "#")))
  }
}`;

const namespacesQuery = (symbols: readonly string[]) => `${DEUS}
SELECT ?symbol ?target WHERE { VALUES ?symbol { ${values(symbols)} } ?symbol deus:namespaceOf ?target }`;

/** A git command's output, or `undefined` when it fails; the tree degrades rather than erroring on git. */
const git = (root: string, args: readonly string[]): Effect.Effect<string | undefined> =>
  Effect.callback<string | undefined>((resume) => {
    execFile('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      // Logged, since the tree only degrades (no branch, a folder name for the repository) and would hide why.
      if (error) {
        console.error(`code-index · git ${args.join(' ')} failed: ${stderr.trim() || error.message}`);
      }
      resume(Effect.succeed(error ? undefined : stdout));
    });
  });

/** The `owner/name` of the repository's GitHub remote, or `undefined` when it has none or git failed. */
const githubName = (root: string): Effect.Effect<string | undefined> =>
  git(root, ['remote', 'get-url', 'origin']).pipe(
    Effect.map((stdout) => (stdout ? /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\s*$/.exec(stdout)?.[1] : undefined)),
  );

/** The branch checked out, or the short commit on a detached head. */
const currentBranch = (root: string): Effect.Effect<string | undefined> =>
  Effect.gen(function* () {
    const branch = (yield* git(root, ['branch', '--show-current']))?.trim();
    return branch || (yield* git(root, ['rev-parse', '--short', 'HEAD']))?.trim() || undefined;
  });

/** The branch changes are measured against: the remote's default (`origin/HEAD`), else `origin/main`. */
const baseBranch = (root: string): Effect.Effect<string> =>
  git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']).pipe(
    Effect.map((stdout) => stdout?.trim() || 'origin/main'),
  );

/**
 * The repository-relative paths that differ from the base: committed since the merge-base, changed in
 * the working tree, or untracked. A deleted file is listed too, and simply matches nothing indexed.
 */
const changedPaths = (root: string, base: string): Effect.Effect<Set<string>> =>
  Effect.gen(function* () {
    const mergeBase = (yield* git(root, ['merge-base', 'HEAD', base]))?.trim();
    const [diff, untracked] = yield* Effect.all(
      [
        mergeBase ? git(root, ['diff', '--name-only', '-z', mergeBase]) : Effect.succeed(undefined),
        git(root, ['ls-files', '--others', '--exclude-standard', '-z']),
      ],
      { concurrency: 'unbounded' },
    );
    return new Set([...(diff ?? '').split('\0'), ...(untracked ?? '').split('\0')].filter((path) => path.length > 0));
  });

/** How long a diff listing is reused: one tree level asks for it once per batch, and a few at once. */
const CHANGES_TTL_MS = 3_000;

/** Whether a repository-relative path stays in the tree; diff mode keeps only what leads to a change. */
type Keep = (path: string) => boolean;

const keepAll: Keep = () => true;

/**
 * Every subpath key of a manifest's `exports`, by the repository-relative file it maps to. The
 * index records an entry as a file, not the key importers write, so the key is read back from the
 * manifest; a condition map is searched whole because the entry may be any of its targets.
 */
const subpathKeys = (root: string, pkg: Package): Effect.Effect<Map<string, string>> =>
  Effect.promise(() => readFile(join(root, pkg.path, 'package.json'), 'utf8').catch(() => '{}')).pipe(
    Effect.map((text) => {
      const keys = new Map<string, string>();
      const manifest: unknown = (() => {
        try {
          return JSON.parse(text);
        } catch {
          return {};
        }
      })();
      const exports = typeof manifest === 'object' && manifest !== null ? Reflect.get(manifest, 'exports') : undefined;
      const targets = (value: unknown): string[] =>
        typeof value === 'string'
          ? [value]
          : typeof value === 'object' && value !== null
            ? Object.values(value).flatMap(targets)
            : [];
      const add = (key: string, value: unknown) => {
        for (const target of targets(value)) {
          const path = normalize(join(pkg.path, target));
          if (!keys.has(path)) {
            keys.set(path, key);
          }
        }
      };
      if (typeof exports === 'string' || Array.isArray(exports)) {
        add('.', exports);
      } else if (typeof exports === 'object' && exports !== null) {
        const subpaths = Object.entries(exports).filter(([key]) => key.startsWith('.'));
        if (subpaths.length === 0) {
          add('.', exports);
        }
        for (const [key, value] of subpaths) {
          add(key, value);
        }
      }
      return keys;
    }),
  );

/** `.` first, then the subpaths in order. */
/** The detail that marks a package's `.` entry, the module a bare `import … from 'pkg'` resolves to. */
export const ROOT_ENTRY = '<root>';

/**
 * An entry named as the module file it is, relative to the package's `src` (or the package for a
 * file outside it): `./Aggregate.ts`, `./index.ts`. The tree is about modules, so a row reads as one.
 */
const entryLabel = (pkg: Package, path: string): string => {
  const inPackage = path.slice(pkg.path.length + 1);
  return `./${inPackage.startsWith('src/') ? inPackage.slice('src/'.length) : inPackage}`;
};

/** The root entry first, then the rest by name. */
const bySubpath = (left: Protocol.TreeNode, right: Protocol.TreeNode): number =>
  Number(right.detail === ROOT_ENTRY) - Number(left.detail === ROOT_ENTRY) || left.label.localeCompare(right.label);

const symbolQuery = (symbol: string) => `${DEUS}
SELECT ?name ?kind ?line ?endLine ?snippet ?members ?typeTerm ?path ?canonical ?packageName WHERE {
  <${symbol}> deus:name ?name ; deus:kind ?kind .
  OPTIONAL { <${symbol}> deus:typeTerm ?typeTerm }
  OPTIONAL { <${symbol}> deus:line ?line }
  OPTIONAL { <${symbol}> deus:endLine ?endLine }
  OPTIONAL { <${symbol}> deus:snippet ?snippet }
  OPTIONAL { <${symbol}> deus:members ?members }
  OPTIONAL { <${symbol}> deus:canonicalName ?canonical }
  ?file deus:declares <${symbol}> ; deus:path ?path .
  OPTIONAL { ?file deus:inPackage ?pkg . ?pkg deus:name ?packageName }
} LIMIT 1`;

// A file's package is the one it is in; a package's is itself.
const pathQuery = (iri: string) => `${DEUS}
SELECT ?path ?name ?packageName WHERE {
  <${iri}> deus:path|deus:packagePath ?path .
  OPTIONAL { <${iri}> deus:name ?name }
  OPTIONAL { <${iri}> deus:inPackage ?pkg . ?pkg deus:name ?packageName }
} LIMIT 1`;

/** The most a card shows; a longer declaration or file is cut and marked truncated. */
const MAX_LINES = 120;

/**
 * Where a declaration starting at `start` (0-based) ends: the first line at which every bracket it
 * opened is closed again and the statement has ended. A scan rather than a parse, so a bracket in a
 * string or a comment can end it early or late; `MAX_LINES` bounds the damage.
 */
const declarationEnd = (lines: readonly string[], start: number): number => {
  let depth = 0;
  for (let index = start; index < lines.length && index < start + MAX_LINES; index++) {
    const text = lines[index].replace(/\/\/.*$/, '');
    for (const char of text) {
      if (char === '{' || char === '(' || char === '[') {
        depth++;
      } else if (char === '}' || char === ')' || char === ']') {
        depth--;
      }
    }
    const trimmed = text.trimEnd();
    // A line ending in an operator continues the statement on the next one.
    if (depth <= 0 && !/(=>|[=(,<|&?:])$/.test(trimmed)) {
      return index;
    }
  }
  return Math.min(lines.length, start + MAX_LINES) - 1;
};

/** Lines with their common leading whitespace removed: a member excerpt reads from the left edge, not a class's indent. */
const dedent = (lines: readonly string[]): string[] => {
  const margin = Math.min(
    ...lines.filter((line) => line.trim().length > 0).map((line) => /^\s*/.exec(line)?.[0].length ?? 0),
  );
  return Number.isFinite(margin) ? lines.map((line) => line.slice(margin)) : [...lines];
};

/** The JSDoc or line comments directly above `start`, so a card carries the declaration's documentation. */
const commentStart = (lines: readonly string[], start: number): number => {
  let index = start;
  while (index > 0 && /^\s*(\/\*\*|\*|\*\/|\/\/)/.test(lines[index - 1])) {
    index--;
  }
  return index;
};

/** Resolves node ids to their children, querying the store once per id kind for the whole batch. */
export const make = (store: Store.Api, root: string) =>
  Effect.gen(function* () {
    // Only a name the remote gave is kept: a failed lookup falls back for that request and is tried again.
    let named: string | undefined;
    const repository = Effect.gen(function* () {
      if (named === undefined) {
        named = yield* githubName(root);
      }
      return named ?? basename(root);
    });

    let changes: { readonly at: number; readonly base: string; readonly keep: Keep } | undefined;
    /** What diff mode keeps: a changed file, and every directory on the way to one. */
    const changed = Effect.gen(function* () {
      if (changes && Date.now() - changes.at < CHANGES_TTL_MS) {
        return changes;
      }
      const base = yield* baseBranch(root);
      const paths = yield* changedPaths(root, base);
      const kept = new Set<string>(['']);
      for (const path of paths) {
        const parts = path.split('/');
        for (let index = 1; index <= parts.length; index++) {
          kept.add(parts.slice(0, index).join('/'));
        }
      }
      changes = { at: Date.now(), base, keep: (path) => kept.has(path) };
      return changes;
    });

    /** Directories and packages directly under `dir` (`''` for the repository root), in diff mode only changed ones. */
    const listing = (packages: readonly Package[], dir: string, keep: Keep = keepAll): Protocol.TreeNode[] => {
      const prefix = dir === '' ? '' : `${dir}/`;
      const byPath = new Map(packages.map((pkg) => [pkg.path, pkg]));
      const names = new Set<string>();
      for (const pkg of packages) {
        if (pkg.path.startsWith(prefix) && pkg.path !== dir) {
          const name = pkg.path.slice(prefix.length).split('/')[0];
          if (keep(`${prefix}${name}`)) {
            names.add(name);
          }
        }
      }
      return [...names]
        .map((name) => {
          const path = `${prefix}${name}`;
          const pkg = byPath.get(path);
          return pkg
            ? new Protocol.TreeNode({
                id: `${PACKAGE}${pkg.iri}`,
                label: pkg.name,
                kind: 'package',
                branch: true,
                detail: name,
              })
            : new Protocol.TreeNode({ id: `${DIR}${path}`, label: name, kind: 'dir', branch: true });
        })
        .toSorted(byLabel);
    };

    const packageList = store
      .select(PACKAGES)
      .pipe(Effect.map((rows) => rows.map((row) => ({ iri: row.pkg, name: row.name, path: row.path }))));

    /**
     * Each package's entrypoints, labelled with the subpath importers write; then its `src` as a
     * plain file tree, so modules no entry reaches (a service behind an app's bootstrap) have a
     * place too; then any packages nested in it.
     */
    const packageChildren = (packages: readonly Package[], requested: readonly Package[], keep: Keep) =>
      Effect.gen(function* () {
        const rows = requested.length > 0 ? yield* store.select(entriesQuery(requested.map((pkg) => pkg.iri))) : [];
        const result = new Map<string, Protocol.TreeNode[]>();
        yield* Effect.forEach(
          requested,
          (pkg) =>
            Effect.gen(function* () {
              const keys = yield* subpathKeys(root, pkg);
              // A package node can sit in more than one graph, so the same entry edge may come back twice.
              const files = new Map(
                rows
                  .filter((row) => row.pkg === pkg.iri && !isManifest(row.path) && keep(row.path))
                  .map((row) => [row.file, row]),
              );
              const sources =
                keep(`${pkg.path}/src`) && (yield* store.ask(hasSourcesQuery(pkg)))
                  ? [
                      new Protocol.TreeNode({
                        id: `${FOLDER}${pkg.path}/src`,
                        label: 'src',
                        kind: 'folder',
                        branch: true,
                      }),
                    ]
                  : [];
              const entries = [...files.values()]
                .map(
                  (row) =>
                    new Protocol.TreeNode({
                      id: `${MODULE}${row.file}`,
                      label: entryLabel(pkg, row.path),
                      kind: 'entry',
                      branch: true,
                      // The root entry is marked; the others' subpath key is their label's own stem.
                      detail: keys.get(row.path) === '.' ? ROOT_ENTRY : undefined,
                    }),
                )
                .toSorted(bySubpath);
              result.set(`${PACKAGE}${pkg.iri}`, [...entries, ...sources, ...listing(packages, pkg.path, keep)]);
            }),
          { concurrency: 8, discard: true },
        );
        return result;
      });

    /**
     * Each module's exports, with every bare `export *` spliced in transitively. The closure is
     * walked one query per level over the whole frontier, so a deep barrel costs its depth, not
     * its width.
     */
    const moduleChildren = (modules: readonly string[]) =>
      Effect.gen(function* () {
        const stars = new Map<string, string[]>();
        let frontier = [...new Set(modules)];
        while (frontier.length > 0) {
          for (const module of frontier) {
            stars.set(module, []);
          }
          const rows = yield* store.select(starsQuery(frontier));
          for (const row of rows) {
            stars.get(row.module)?.push(row.target);
          }
          frontier = [...new Set(rows.map((row) => row.target))].filter((target) => !stars.has(target));
        }

        const exportRows = yield* store.select(exportsQuery([...stars.keys()]));
        const declared = new Map<string, Map<string, Protocol.TreeNode>>();
        const defaults = new Set<string>();
        for (const row of exportRows) {
          let nodes = declared.get(row.module);
          if (!nodes) {
            nodes = new Map();
            declared.set(row.module, nodes);
          }
          const namespace = row.target !== undefined;
          if (isDefaultExport(row)) {
            defaults.add(row.symbol);
          }
          nodes.set(
            row.symbol,
            new Protocol.TreeNode({
              id: `${SYMBOL}${row.symbol}`,
              label: row.name,
              kind: namespace ? 'namespace' : 'symbol',
              // A class, interface or object type opens onto its members, as a namespace onto its module.
              branch: namespace || parseMembers(row.members).length > 0,
              detail: namespace ? 'namespace' : rowKind(row),
            }),
          );
        }

        // `export *` never re-exports a target's `default`, so only the module asked about keeps its own.
        const collect = (module: string, seen: Set<string>, into: Map<string, Protocol.TreeNode>, viaStar: boolean) => {
          seen.add(module);
          for (const [iri, node] of declared.get(module) ?? []) {
            if (!into.has(iri) && !(viaStar && defaults.has(iri))) {
              into.set(iri, node);
            }
          }
          for (const target of stars.get(module) ?? []) {
            if (!seen.has(target)) {
              collect(target, seen, into, true);
            }
          }
        };
        return new Map(
          modules.map((module) => {
            const into = new Map<string, Protocol.TreeNode>();
            collect(module, new Set(), into, false);
            return [`${MODULE}${module}`, [...into.values()].toSorted(byLabel)];
          }),
        );
      });

    /** A `src` folder's subfolders, then its modules, each a branch onto its exports. */
    const folderChildren = (folders: readonly string[], keep: Keep) =>
      Effect.forEach(
        folders,
        (folder) =>
          Effect.gen(function* () {
            const rows = yield* store.select(sourceFilesQuery(folder));
            const subfolders = new Set<string>();
            const modules = new Map<string, Protocol.TreeNode>();
            // A path survives diff mode when it changed; its folder does when anything under it did.
            for (const row of rows.filter((candidate) => keep(candidate.path))) {
              const rest = row.path.slice(folder.length + 1);
              const slash = rest.indexOf('/');
              if (slash >= 0) {
                subfolders.add(rest.slice(0, slash));
              } else {
                modules.set(
                  row.file,
                  new Protocol.TreeNode({ id: `${MODULE}${row.file}`, label: rest, kind: 'file', branch: true }),
                );
              }
            }
            const nodes = [
              ...[...subfolders].map(
                (name) =>
                  new Protocol.TreeNode({
                    id: `${FOLDER}${folder}/${name}`,
                    label: name,
                    kind: 'folder',
                    branch: true,
                  }),
              ),
              ...modules.values(),
            ].toSorted(
              // Folders before files, as a file explorer lists them; both are branches, so `byLabel` alone cannot tell.
              (left, right) => Number(right.kind === 'folder') - Number(left.kind === 'folder') || byLabel(left, right),
            );
            return [`${FOLDER}${folder}`, nodes] as const;
          }),
        { concurrency: 8 },
      ).pipe(Effect.map((entries) => new Map(entries)));

    /** A namespace export's children are its module's exports, without a row for the module between. */
    // A symbol that declares members lists them; a namespace's children are its module's (below).
    const symbolChildren = (symbols: readonly string[]) =>
      Effect.gen(function* () {
        const [namespaces, members] = yield* Effect.all(
          [namespaceChildren(symbols), symbols.length > 0 ? store.select(membersQuery(symbols)) : Effect.succeed([])],
          { concurrency: 'unbounded' },
        );
        for (const row of members) {
          namespaces.set(`${SYMBOL}${row.symbol}`, memberNodes(row.symbol, row.members));
        }
        return namespaces;
      });

    const namespaceChildren = (symbols: readonly string[]) =>
      Effect.gen(function* () {
        const rows = symbols.length > 0 ? yield* store.select(namespacesQuery(symbols)) : [];
        const modules = yield* moduleChildren(rows.map((row) => row.target));
        return new Map(rows.map((row) => [`${SYMBOL}${row.symbol}`, modules.get(`${MODULE}${row.target}`) ?? []]));
      });

    /**
     * The children of each id. In diff mode the file tree keeps only what leads to a change against
     * the base branch; inside a changed module everything stays, since the module is what changed.
     */
    const children = (
      ids: readonly string[],
      options: { readonly diff?: boolean } = {},
    ): Effect.Effect<Protocol.TreeChildren[], Store.StoreError> =>
      Effect.gen(function* () {
        const unique = [...new Set(ids)];
        const tail = (prefix: string) =>
          unique.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
        const name = yield* repository;
        const diff = options.diff ? yield* changed : undefined;
        const keep = diff?.keep ?? keepAll;
        const found = new Map<string, Protocol.TreeNode[]>();

        if (unique.includes(Protocol.TREE_ROOT)) {
          // The root says which branch the tree shows, and in diff mode what it is compared with.
          const branch = yield* currentBranch(root);
          const base = diff?.base.replace(/^origin\//, '');
          found.set(Protocol.TREE_ROOT, [
            new Protocol.TreeNode({
              id: `${REPO}${name}`,
              label: name,
              kind: 'repo',
              branch: true,
              detail: branch && base ? `${branch} vs ${base}` : branch,
            }),
          ]);
        }

        const dirs = [
          ...tail(REPO)
            .filter((repo) => repo === name)
            .map(() => ''),
          ...tail(DIR),
        ];
        const packageIris = tail(PACKAGE).filter(isIndexIri);
        const packages = dirs.length > 0 || packageIris.length > 0 ? yield* packageList : [];
        for (const dir of dirs) {
          found.set(dir === '' ? `${REPO}${name}` : `${DIR}${dir}`, listing(packages, dir, keep));
        }

        const requested = packages.filter((pkg) => packageIris.includes(pkg.iri));
        // Any repository-relative path the tree could have minted (`[id]`, `(group)` included); `literal` escapes it
        // for the query, so only traversal and control characters are refused.
        const folders = tail(FOLDER).filter(
          (path) =>
            path.length > 0 && !path.split('/').includes('..') && ![...path].some((char) => char.charCodeAt(0) < 0x20),
        );
        const [byPackage, byFolder, byModule, byNamespace] = yield* Effect.all(
          [
            packageChildren(packages, requested, keep),
            folderChildren(folders, keep),
            moduleChildren(tail(MODULE).filter(isIndexIri)),
            symbolChildren(tail(SYMBOL).filter(isIndexIri)),
          ],
          { concurrency: 'unbounded' },
        );
        for (const map of [byPackage, byFolder, byModule, byNamespace]) {
          for (const [id, nodes] of map) {
            found.set(id, nodes);
          }
        }

        // An id that names nothing (a stale one after a reindex) answers with no children rather than failing the batch.
        // Rows are keyed by id in the tree, so a child listed twice must not reach it twice.
        return unique.map(
          (id) =>
            new Protocol.TreeChildren({
              id,
              children: [...new Map((found.get(id) ?? []).map((node) => [node.id, node])).values()],
            }),
        );
      });

    const readLines = (path: string) =>
      Effect.promise(() => readFile(join(root, path), 'utf8').catch(() => undefined)).pipe(
        Effect.map((text) => text?.split('\n')),
      );

    /** The code behind one node; `undefined` for a directory or repository, which have none of their own. */
    const source = (id: string): Effect.Effect<Protocol.TreeSource | undefined, Store.StoreError> =>
      Effect.gen(function* () {
        const isMember = id.startsWith(MEMBER);
        if (isMember || id.startsWith(SYMBOL)) {
          const [iri, key] = isMember ? id.slice(MEMBER.length).split('|') : [id.slice(SYMBOL.length), undefined];
          if (!iri || !isIndexIri(iri)) {
            return undefined;
          }
          const [row] = yield* store.select(symbolQuery(iri));
          if (!row) {
            return undefined;
          }
          const member =
            key === undefined ? undefined : parseMembers(row.members).find((fact) => memberKey(fact) === key);
          if (isMember && !member) {
            return undefined;
          }
          const lines = (yield* readLines(row.path)) ?? [];
          const declared = Math.max(0, (member?.line ?? Number(row.line ?? 1)) - 1);
          const first = commentStart(lines, declared);
          // The recorded end line is exact; a store indexed before it was recorded falls back to the bracket scan.
          const recordedEnd = member?.endLine ?? (row.endLine === undefined ? undefined : Number(row.endLine));
          const end = recordedEnd === undefined ? declarationEnd(lines, declared) : recordedEnd - 1;
          const last = Math.min(end, declared + MAX_LINES - 1);
          const comment = lines.slice(first, declared);
          // A member's one-line signature takes its own line's indentation, so it sits under its JSDoc as in the file.
          const indent = member ? (/^\s*/.exec(lines[declared] ?? '')?.[0] ?? '') : '';
          const signature = member ? `${indent}${member.signature}` : row.snippet;
          const owner = row.canonical ?? row.name;
          return new Protocol.TreeSource({
            id,
            title: member ? `${owner}.${member.name}` : owner,
            subtitle: member?.kind ?? semanticKind({ kind: row.kind, typeTerm: row.typeTerm, snippet: row.snippet }),
            packageName: row.packageName,
            path: row.path,
            line: first + 1,
            code: dedent(lines.slice(first, last + 1)).join('\n'),
            signature: signature === undefined ? undefined : dedent([...comment, ...signature.split('\n')]).join('\n'),
            truncated: end > last,
          });
        }

        const isModule = id.startsWith(MODULE);
        if (isModule || id.startsWith(PACKAGE)) {
          const iri = id.slice(isModule ? MODULE.length : PACKAGE.length);
          if (!isIndexIri(iri)) {
            return undefined;
          }
          const [row] = yield* store.select(pathQuery(iri));
          if (!row) {
            return undefined;
          }
          const path = isModule ? row.path : join(row.path, 'package.json');
          const lines = (yield* readLines(path)) ?? [];
          return new Protocol.TreeSource({
            id,
            title: isModule ? (row.path.split('/').at(-1) ?? row.path) : (row.name ?? row.path),
            subtitle: isModule ? 'module' : 'package',
            packageName: isModule ? row.packageName : row.name,
            path,
            line: 1,
            code: lines.slice(0, MAX_LINES).join('\n'),
            truncated: lines.length > MAX_LINES,
          });
        }

        return undefined;
      });

    /** The ids from the top of the tree down to a package: repository, directories, enclosing packages. */
    const packagePath = (packages: readonly Package[], pkg: Package, name: string): string[] => {
      const byPath = new Map(packages.map((entry) => [entry.path, entry]));
      const parts = pkg.path.split('/');
      return [
        `${REPO}${name}`,
        ...parts.map((_, index) => {
          const prefix = parts.slice(0, index + 1).join('/');
          const enclosing = byPath.get(prefix);
          return enclosing ? `${PACKAGE}${enclosing.iri}` : `${DIR}${prefix}`;
        }),
      ];
    };

    /** Ids from below the root down to a module: its package, then either the entry it is or its place in `src`. */
    const modulePath = (packages: readonly Package[], file: string, name: string) =>
      Effect.gen(function* () {
        const [row] = yield* store.select(fileQuery(file));
        const pkg = packages.find((candidate) => candidate.iri === row?.pkg);
        if (!row || !pkg) {
          return undefined;
        }
        const above = packagePath(packages, pkg, name);
        if (yield* store.ask(entryQuery(pkg.iri, file))) {
          return [...above, `${MODULE}${file}`];
        }
        const src = `${pkg.path}/src`;
        if (!row.path.startsWith(`${src}/`) || /\.(test|stories|spec)\.tsx?$/.test(row.path)) {
          return above;
        }
        const parts = row.path
          .slice(src.length + 1)
          .split('/')
          .slice(0, -1);
        return [
          ...above,
          `${FOLDER}${src}`,
          ...parts.map((_, index) => `${FOLDER}${src}/${parts.slice(0, index + 1).join('/')}`),
          `${MODULE}${file}`,
        ];
      });

    /**
     * Where a node sits in the tree: the ids from below the root down to it, or down to its nearest
     * ancestor the tree shows (a declaration nothing exports is shown by its module). A symbol is
     * placed under the entry that exposes it when one does, and in its package's `src` otherwise.
     */
    const locate = (id: string): Effect.Effect<string[] | undefined, Store.StoreError> =>
      Effect.gen(function* () {
        // A member sits under its owner, when the owner is a row; otherwise the owner's place is as close as it gets.
        if (id.startsWith(MEMBER)) {
          const owner = `${SYMBOL}${id.slice(MEMBER.length).split('|')[0]}`;
          const path = yield* locate(owner);
          return path?.at(-1) === owner ? [...path, id] : path;
        }
        const name = yield* repository;
        const packages = yield* packageList;
        if (id.startsWith(PACKAGE)) {
          const pkg = packages.find((candidate) => `${PACKAGE}${candidate.iri}` === id);
          return pkg ? packagePath(packages, pkg, name) : undefined;
        }
        if (id.startsWith(MODULE)) {
          const file = id.slice(MODULE.length);
          return isIndexIri(file) ? yield* modulePath(packages, file, name) : undefined;
        }
        const symbol = id.slice(SYMBOL.length);
        if (!id.startsWith(SYMBOL) || !isIndexIri(symbol)) {
          return undefined;
        }
        const [declaration] = yield* store.select(declarationQuery(symbol));
        if (!declaration) {
          return undefined;
        }
        const exposures = (yield* store.select(exposureQuery(symbol))).toSorted(
          (left, right) => VIA_RANK[left.via] - VIA_RANK[right.via],
        );
        for (const exposure of exposures) {
          // `reexports+` also follows `export { x } from`, so a star exposure is kept only if the entry's
          // own rows (which splice bare `export *` alone) really list the symbol.
          if (exposure.via === 'star') {
            const listed = (yield* moduleChildren([exposure.entry])).get(`${MODULE}${exposure.entry}`) ?? [];
            if (!listed.some((node) => node.id === id)) {
              continue;
            }
          }
          const entryPath = yield* modulePath(packages, exposure.entry, name);
          if (entryPath) {
            return [...entryPath, ...(exposure.via === 'namespace' ? [`${SYMBOL}${exposure.namespace}`] : []), id];
          }
        }
        const inSource = yield* modulePath(packages, declaration.file, name);
        // Only exports are rows under a module; anything else is shown by the module that declares it.
        return inSource && declaration.exported === 'true' && inSource.at(-1)?.startsWith(MODULE)
          ? [...inSource, id]
          : inSource;
      });

    return { children, source, locate };
  });
