//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
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

const REPO = 'repo:';
const DIR = 'dir:';
const PACKAGE = 'pkg:';
const MODULE = 'mod:';
const SYMBOL = 'sym:';

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

/** An IRI the store minted; anything else in a request is dropped rather than spliced into SPARQL. */
const INVALID_IRI = /[<>"{}|^`\\\s]/;
const isIndexIri = (iri: string): boolean => iri.startsWith(Ontology.IRI_BASE) && !INVALID_IRI.test(iri);
const values = (iris: readonly string[]): string => iris.map((iri) => `<${iri}>`).join(' ');

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

// A package that publishes nothing (an app) is shown by the modules at the top of its `src/`.
const sourceModulesQuery = (pkg: Package) => `${DEUS}
SELECT ?file ?path WHERE {
  ?file deus:inPackage <${pkg.iri}> ; deus:path ?path ; deus:language "typescript" .
  FILTER(STRSTARTS(?path, ${JSON.stringify(`${pkg.path}/src/`)}))
  FILTER(!CONTAINS(STRAFTER(?path, ${JSON.stringify(`${pkg.path}/src/`)}), "/"))
  FILTER(!REGEX(?path, "\\\\.(test|stories|spec)\\\\.tsx?$"))
}`;

/** Every manifest exports its own `package.json`; as a tree row it is noise, and the package's card already shows it. */
const isManifest = (path: string): boolean => path.endsWith('/package.json');

// A named re-export takes the kind of what it resolves to, so `export { DXN } from` reads as the class it is.
const exportsQuery = (modules: readonly string[]) => `${DEUS}
SELECT ?module ?symbol ?name ?declKind ?realKind ?target WHERE {
  VALUES ?module { ${values(modules)} }
  ?module deus:declares ?symbol .
  ?symbol deus:exported true ; deus:name ?name ; deus:kind ?declKind .
  OPTIONAL { ?symbol deus:resolvesTo ?real . ?real deus:kind ?realKind }
  OPTIONAL { ?symbol deus:namespaceOf ?target }
}`;

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

/** The `owner/name` of the repository's GitHub remote, or the directory name when it has none. */
const repositoryName = (root: string): Effect.Effect<string> =>
  Effect.callback<string>((resume) => {
    execFile('git', ['remote', 'get-url', 'origin'], { cwd: root }, (error, stdout) => {
      const match = error ? null : /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\s*$/.exec(stdout);
      resume(Effect.succeed(match?.[1] ?? basename(root)));
    });
  });

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
const bySubpath = (left: Protocol.TreeNode, right: Protocol.TreeNode): number =>
  Number(right.label === '.') - Number(left.label === '.') || left.label.localeCompare(right.label);

const symbolQuery = (symbol: string) => `${DEUS}
SELECT ?name ?kind ?line ?path ?canonical WHERE {
  <${symbol}> deus:name ?name ; deus:kind ?kind .
  OPTIONAL { <${symbol}> deus:line ?line }
  OPTIONAL { <${symbol}> deus:canonicalName ?canonical }
  ?file deus:declares <${symbol}> ; deus:path ?path .
} LIMIT 1`;

const pathQuery = (iri: string) => `${DEUS}
SELECT ?path ?name WHERE { <${iri}> deus:path|deus:packagePath ?path . OPTIONAL { <${iri}> deus:name ?name } } LIMIT 1`;

/** A SPARQL string literal; JSON's escapes are a subset of SPARQL's. */
const literal = (value: string): string => JSON.stringify(value);

// Named re-exports and namespaces are left out: each repeats a declaration found under its own name.
const searchSymbolsQuery = (needle: string) => `${DEUS}
SELECT ?symbol ?name ?kind ?canonical ?pkg WHERE {
  ?symbol deus:packagePublic true ; deus:name ?name ; deus:kind ?kind .
  FILTER(?kind != "reexport" && ?kind != "namespace")
  FILTER(CONTAINS(LCASE(?name), ${literal(needle)}))
  OPTIONAL { ?symbol deus:canonicalName ?canonical }
  ?file deus:declares ?symbol ; deus:inPackage ?pkg .
} LIMIT 400`;

const searchPackagesQuery = (needle: string) => `${DEUS}
SELECT ?pkg WHERE { ?pkg a deus:Package ; deus:name ?name . FILTER(CONTAINS(LCASE(?name), ${literal(needle)})) } LIMIT 100`;

/**
 * Which entry of its package exposes each symbol, and how: declared by the entry itself, behind a
 * namespace the entry exports, or through a chain of `export *`. The tree shows a symbol under the
 * entry that reaches it, so its path goes through one of these.
 */
const exposureQuery = (symbols: readonly string[]) => `${DEUS}
SELECT ?symbol ?entry ?namespace ?via WHERE {
  VALUES ?symbol { ${values(symbols)} }
  ?file deus:declares ?symbol ; deus:inPackage ?pkg .
  ?pkg deus:entry ?entry .
  {
    ?entry deus:declares ?symbol . BIND("direct" AS ?via)
  } UNION {
    ?entry deus:declares ?namespace . ?namespace deus:namespaceOf ?file . BIND("namespace" AS ?via)
  } UNION {
    ?entry deus:reexports+ ?file . BIND("star" AS ?via)
  }
}`;

const VIA_RANK: Record<string, number> = { direct: 0, star: 1, namespace: 2 };

/** Exact name, then prefix, then substring; shorter names first within each. */
const matchRank = (name: string, needle: string): number => {
  const lower = name.toLowerCase();
  return (lower === needle ? 0 : lower.startsWith(needle) ? 1 : 2) * 1000 + name.length;
};

const MAX_HITS = 50;

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
    const repository = yield* Effect.cached(repositoryName(root));

    /** Directories and packages directly under `dir` (`''` for the repository root). */
    const listing = (packages: readonly Package[], dir: string): Protocol.TreeNode[] => {
      const prefix = dir === '' ? '' : `${dir}/`;
      const byPath = new Map(packages.map((pkg) => [pkg.path, pkg]));
      const names = new Set<string>();
      for (const pkg of packages) {
        if (pkg.path.startsWith(prefix) && pkg.path !== dir) {
          names.add(pkg.path.slice(prefix.length).split('/')[0]);
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

    /** Each package's entrypoints, labelled with the subpath importers write, then any packages nested in it. */
    const packageChildren = (packages: readonly Package[], requested: readonly Package[]) =>
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
                rows.filter((row) => row.pkg === pkg.iri && !isManifest(row.path)).map((row) => [row.file, row]),
              );
              const published = [...files.values()];
              const sources = published.length > 0 ? [] : yield* store.select(sourceModulesQuery(pkg));
              const entries = [...published, ...sources]
                .map(
                  (row) =>
                    new Protocol.TreeNode({
                      id: `${MODULE}${row.file}`,
                      label: keys.get(row.path) ?? row.path.slice(pkg.path.length + 1),
                      kind: 'entry',
                      branch: true,
                      detail: row.path.slice(pkg.path.length + 1),
                    }),
                )
                .toSorted(bySubpath);
              result.set(`${PACKAGE}${pkg.iri}`, [...entries, ...listing(packages, pkg.path)]);
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
        for (const row of exportRows) {
          let nodes = declared.get(row.module);
          if (!nodes) {
            nodes = new Map();
            declared.set(row.module, nodes);
          }
          const namespace = row.target !== undefined;
          nodes.set(
            row.symbol,
            new Protocol.TreeNode({
              id: `${SYMBOL}${row.symbol}`,
              label: row.name,
              kind: namespace ? 'namespace' : 'symbol',
              branch: namespace,
              detail: namespace ? 'namespace' : (row.realKind ?? row.declKind),
            }),
          );
        }

        const collect = (module: string, seen: Set<string>, into: Map<string, Protocol.TreeNode>) => {
          seen.add(module);
          for (const [iri, node] of declared.get(module) ?? []) {
            if (!into.has(iri)) {
              into.set(iri, node);
            }
          }
          for (const target of stars.get(module) ?? []) {
            if (!seen.has(target)) {
              collect(target, seen, into);
            }
          }
        };
        return new Map(
          modules.map((module) => {
            const into = new Map<string, Protocol.TreeNode>();
            collect(module, new Set(), into);
            return [`${MODULE}${module}`, [...into.values()].toSorted(byLabel)];
          }),
        );
      });

    /** A namespace export's children are its module's exports, without a row for the module between. */
    const namespaceChildren = (symbols: readonly string[]) =>
      Effect.gen(function* () {
        const rows = symbols.length > 0 ? yield* store.select(namespacesQuery(symbols)) : [];
        const modules = yield* moduleChildren(rows.map((row) => row.target));
        return new Map(rows.map((row) => [`${SYMBOL}${row.symbol}`, modules.get(`${MODULE}${row.target}`) ?? []]));
      });

    const children = (ids: readonly string[]): Effect.Effect<Protocol.TreeChildren[], Store.StoreError> =>
      Effect.gen(function* () {
        const unique = [...new Set(ids)];
        const tail = (prefix: string) =>
          unique.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
        const name = yield* repository;
        const found = new Map<string, Protocol.TreeNode[]>();

        if (unique.includes(Protocol.TREE_ROOT)) {
          found.set(Protocol.TREE_ROOT, [
            new Protocol.TreeNode({ id: `${REPO}${name}`, label: name, kind: 'repo', branch: true }),
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
          found.set(dir === '' ? `${REPO}${name}` : `${DIR}${dir}`, listing(packages, dir));
        }

        const requested = packages.filter((pkg) => packageIris.includes(pkg.iri));
        const [byPackage, byModule, byNamespace] = yield* Effect.all(
          [
            packageChildren(packages, requested),
            moduleChildren(tail(MODULE).filter(isIndexIri)),
            namespaceChildren(tail(SYMBOL).filter(isIndexIri)),
          ],
          { concurrency: 'unbounded' },
        );
        for (const map of [byPackage, byModule, byNamespace]) {
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
        if (id.startsWith(SYMBOL)) {
          const iri = id.slice(SYMBOL.length);
          if (!isIndexIri(iri)) {
            return undefined;
          }
          const [row] = yield* store.select(symbolQuery(iri));
          if (!row) {
            return undefined;
          }
          const lines = (yield* readLines(row.path)) ?? [];
          const declared = Math.max(0, Number(row.line ?? 1) - 1);
          const first = commentStart(lines, declared);
          const last = declarationEnd(lines, declared);
          return new Protocol.TreeSource({
            id,
            title: row.canonical ?? row.name,
            subtitle: row.kind,
            path: row.path,
            line: first + 1,
            code: lines.slice(first, last + 1).join('\n'),
            truncated: last - declared + 1 >= MAX_LINES,
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
            title: isModule ? row.path : (row.name ?? row.path),
            subtitle: isModule ? 'module' : 'package',
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

    const search = (query: string): Effect.Effect<Protocol.TreeHit[], Store.StoreError> =>
      Effect.gen(function* () {
        const needle = query.trim().toLowerCase();
        if (needle.length === 0) {
          return [];
        }
        const name = yield* repository;
        const [packages, symbolRows, packageRows] = yield* Effect.all(
          [packageList, store.select(searchSymbolsQuery(needle)), store.select(searchPackagesQuery(needle))],
          { concurrency: 'unbounded' },
        );
        const byIri = new Map(packages.map((pkg) => [pkg.iri, pkg]));

        const packageHits = packageRows.flatMap((row) => {
          const pkg = byIri.get(row.pkg);
          return pkg
            ? [
                {
                  rank: matchRank(pkg.name, needle),
                  hit: new Protocol.TreeHit({
                    node: new Protocol.TreeNode({
                      id: `${PACKAGE}${pkg.iri}`,
                      label: pkg.name,
                      kind: 'package',
                      branch: true,
                      detail: pkg.path.split('/').at(-1),
                    }),
                    description: pkg.path,
                    path: packagePath(packages, pkg, name),
                  }),
                },
              ]
            : [];
        });

        const ranked = [...new Map(symbolRows.map((row) => [row.symbol, row])).values()]
          .toSorted((left, right) => matchRank(left.name, needle) - matchRank(right.name, needle))
          .slice(0, MAX_HITS);
        const exposures = ranked.length > 0 ? yield* store.select(exposureQuery(ranked.map((row) => row.symbol))) : [];
        const best = new Map<string, Store.Binding>();
        for (const row of exposures) {
          const current = best.get(row.symbol);
          if (!current || VIA_RANK[row.via] < VIA_RANK[current.via]) {
            best.set(row.symbol, row);
          }
        }

        const symbolHits = ranked.flatMap((row) => {
          const pkg = byIri.get(row.pkg);
          const exposure = best.get(row.symbol);
          if (!pkg || !exposure) {
            return [];
          }
          return [
            {
              rank: matchRank(row.name, needle),
              hit: new Protocol.TreeHit({
                node: new Protocol.TreeNode({
                  id: `${SYMBOL}${row.symbol}`,
                  label: row.name,
                  kind: 'symbol',
                  branch: false,
                  detail: row.kind,
                }),
                description: `${row.canonical ?? row.name} · ${pkg.name}`,
                path: [
                  ...packagePath(packages, pkg, name),
                  `${MODULE}${exposure.entry}`,
                  ...(exposure.via === 'namespace' ? [`${SYMBOL}${exposure.namespace}`] : []),
                  `${SYMBOL}${row.symbol}`,
                ],
              }),
            },
          ];
        });

        return [...packageHits, ...symbolHits]
          .toSorted((left, right) => left.rank - right.rank)
          .slice(0, MAX_HITS)
          .map(({ hit }) => hit);
      });

    return { children, source, search };
  });
