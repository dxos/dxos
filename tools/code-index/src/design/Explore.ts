//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import { basename } from 'node:path';

import * as Ontology from '../Ontology.ts';
import type * as Store from '../Store.ts';
import * as Graph from './Graph.ts';
import * as Text from './Text.ts';

/**
 * The recall stage: from a prompt to a few hundred candidate files with cards and typed edges. The
 * deterministic explorer seeds by text match over paths, declarations, docs and spec blocks, then
 * walks a fixed relation set; the LLM explorer (`LlmExplorer.ts`) chooses the seeds and relations
 * itself and hands them to the same walk, so the two differ only in judgement.
 */

const D = Ontology.PREFIX;

/** Files that never belong in an architecture answer, whatever links to them. */
const EXCLUDED = /(\.test\.|\.spec\.|\.stories\.|\.d\.ts$|\/dist\/|\/__snapshots__\/|\/node_modules\/|\.config\.)/;

/** Only source files are components. */
const SOURCE = /\.(m|c)?tsx?$/;

export const isComponentPath = (path: string): boolean => SOURCE.test(path) && !EXCLUDED.test(path);

/** The relations the deterministic explorer walks; `apiDependsOn` and `reexports` are left to the LLM. */
export const DEFAULT_RELATIONS: readonly Graph.EdgeKind[] = [
  'imports',
  'providesService',
  'requiresService',
  'layerRequires',
  'implementsOperation',
  'contributesCapability',
  'extends',
  'implDependsOn',
];

export type ExploreOptions = {
  readonly prompt: string;
  /** Upper bound on candidates. */
  readonly maxNodes?: number;
  /** Seeds to take from text match. */
  readonly seeds?: number;
  /** How far from a seed to walk: 1 or 2. */
  readonly hops?: number;
  readonly relations?: readonly Graph.EdgeKind[];
};

export type Seed = { readonly iri: string; readonly score: number; readonly why: string };

const chunks = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

const values = (iris: readonly string[]): string => iris.map((iri) => `<${iri}>`).join(' ');

const isFileIri = (iri: string): boolean => iri.startsWith(Ontology.FILE_BASE);

/**
 * The best-matching files for a prompt, by text over each file's path, its exported declarations'
 * names and docs, and the spec blocks that describe them. A file's score is its best single match.
 */
export const seeds = (store: Store.Api, prompt: string, count = 12): Effect.Effect<Seed[], Store.StoreError> =>
  Effect.gen(function* () {
    const query = Text.query(prompt);
    const best = new Map<string, Seed>();
    const offer = (iri: string, score: number, why: string) => {
      const current = best.get(iri);
      if (score > 0 && (!current || score > current.score)) {
        best.set(iri, { iri, score, why });
      }
    };

    const files = yield* store.listFiles({ language: 'typescript' });
    for (const file of files) {
      if (isComponentPath(file.path)) {
        // The path is weighted below a declaration match: every file under `agent-runtime/` matches
        // "agent runtime", while the declarations tell the central ones apart.
        offer(Ontology.fileIri(file.path).value, 0.8 * Text.match(query, file.path), `path ${file.path}`);
      }
    }

    const declared = yield* store.select(`PREFIX deus: <${D}>
      SELECT ?file ?name ?doc WHERE {
        ?file deus:declares ?symbol . ?symbol deus:exported true ; deus:name ?name .
        OPTIONAL { ?symbol deus:doc ?doc }
      }`);
    for (const row of declared) {
      const path = Graph.pathOf(row.file, Ontology.FILE_BASE);
      if (!isComponentPath(path)) {
        continue;
      }
      const name = Text.match(query, row.name);
      const doc = row.doc ? 0.7 * Text.match(query, row.doc) : 0;
      // A declaration whose name matches and that sits on a matching path is the strongest signal.
      const onPath = Text.match(query, path) > 0 ? 0.15 : 0;
      offer(row.file, Math.max(name, doc) + onPath, name >= doc ? `declares ${row.name}` : `doc of ${row.name}`);
    }

    const specs = yield* store.select(`PREFIX deus: <${D}>
      SELECT ?symbol ?name ?field WHERE {
        ?block deus:describes ?symbol ; deus:name ?name .
        OPTIONAL { ?block deus:field ?field }
      }`);
    for (const row of specs) {
      const file = Graph.fileOfSymbol(row.symbol);
      if (isFileIri(file) && isComponentPath(Graph.pathOf(file, Ontology.FILE_BASE))) {
        offer(file, 0.9 * Text.match(query, `${row.name} ${row.field ?? ''}`), `spec ${row.name}`);
      }
    }

    // Seeds well below the best match are noise that a hub (`errors.ts`) turns into hundreds of
    // candidates, so the cut is relative to the strongest match rather than a fixed count alone.
    const ranked = [...best.values()].sort((left, right) => right.score - left.score);
    const floor = 0.6 * (ranked[0]?.score ?? 0);
    return ranked.filter((seed) => seed.score >= floor).slice(0, count);
  });

/** The package directory a path lies in (`…/src/…` is inside it). */
const packageDir = (path: string): string | undefined => {
  const index = path.indexOf('/src/');
  return index > 0 ? path.slice(0, index) : undefined;
};

/** The SPARQL that lists one relation's lifted edges touching a set of files, in both directions. */
const relationQuery = (kind: Graph.EdgeKind, iris: readonly string[]): string => {
  const set = values(iris);
  if (kind === 'imports' || kind === 'reexports') {
    return `PREFIX deus: <${D}>
      SELECT ?from ?to WHERE {
        { VALUES ?from { ${set} } ?from deus:${kind} ?to }
        UNION
        { VALUES ?to { ${set} } ?from deus:${kind} ?to }
      }`;
  }
  // Symbol-level relations are lifted to their files: a symbol IRI is its file IRI plus a fragment.
  // The third branch finds users who reached a declaration through a barrel's named re-export.
  return `PREFIX deus: <${D}>
    SELECT ?from ?to WHERE {
      { VALUES ?file { ${set} } ?file deus:declares ?from . ?from deus:${kind} ?to }
      UNION
      { VALUES ?file { ${set} } ?file deus:declares ?to . ?from deus:${kind} ?to }
      UNION
      { VALUES ?file { ${set} } ?file deus:declares ?to . ?alias deus:aliasOf ?to . ?from deus:${kind} ?alias }
    }`;
};

/**
 * The files among `iris` that only forward: they re-export at least one file and declare nothing
 * but re-exports. Such a file is how code is reached, not a component of it.
 */
export const barrelFiles = (store: Store.Api, iris: readonly string[]): Effect.Effect<Set<string>, Store.StoreError> =>
  Effect.gen(function* () {
    const barrels = new Set<string>();
    for (const batch of chunks([...new Set(iris)], 40)) {
      const rows = yield* store.select(`PREFIX deus: <${D}>
        SELECT DISTINCT ?file WHERE {
          VALUES ?file { ${values(batch)} }
          ?file deus:reexports ?forwarded .
          FILTER NOT EXISTS { ?file deus:declares ?symbol . FILTER NOT EXISTS { ?symbol deus:kind "reexport" } }
        }`);
      for (const row of rows) {
        barrels.add(row.file);
      }
    }
    return barrels;
  });

/**
 * The declaration behind each symbol IRI that names a re-export: the barrel's `aliasOf` for a named
 * re-export, else the symbol of that name in a file the barrel reaches through `export *`. Without
 * this a dependency on `@dxos/x` lands on the package's `index.ts` rather than on what it uses.
 */
export const resolveReexports = (
  store: Store.Api,
  iris: readonly string[],
): Effect.Effect<Map<string, string>, Store.StoreError> =>
  Effect.gen(function* () {
    const resolved = new Map<string, string>();
    const symbols = [...new Set(iris)].filter((iri) => isFileIri(iri) && iri.includes('#'));
    for (const batch of chunks(symbols, 40)) {
      const rows = yield* store.select(`PREFIX deus: <${D}>
        SELECT ?target ?decl WHERE { VALUES ?target { ${values(batch)} } ?target deus:aliasOf ?decl }`);
      for (const row of rows) {
        resolved.set(row.target, row.decl);
      }
    }
    const starred = symbols.filter((iri) => !resolved.has(iri));
    for (const batch of chunks(starred, 40)) {
      const triples = batch
        .map((iri) => `(<${iri}> <${Graph.fileOfSymbol(iri)}> ${JSON.stringify(iri.slice(iri.indexOf('#') + 1))})`)
        .join(' ');
      const rows = yield* store.select(`PREFIX deus: <${D}>
        SELECT ?target ?decl WHERE {
          VALUES (?target ?barrel ?name) { ${triples} }
          ?barrel deus:reexports+ ?file . ?file deus:declares ?decl . ?decl deus:name ?name .
          FILTER NOT EXISTS { ?decl deus:kind "reexport" }
        }`);
      for (const row of rows) {
        if (!resolved.has(row.target)) {
          resolved.set(row.target, row.decl);
        }
      }
    }
    return resolved;
  });

/** Every lifted edge of the given kinds touching any of `iris`, file → file, components only. */
export const edgesTouching = (
  store: Store.Api,
  iris: readonly string[],
  kinds: readonly Graph.EdgeKind[],
): Effect.Effect<Graph.Edge[], Store.StoreError> =>
  Effect.gen(function* () {
    const raw: { from: string; to: string; kind: Graph.EdgeKind }[] = [];
    for (const kind of kinds) {
      for (const batch of chunks(iris, 40)) {
        const rows = yield* store.select(relationQuery(kind, batch));
        raw.push(...rows.map((row) => ({ from: row.from, to: row.to, kind })));
      }
    }
    const declarations = yield* resolveReexports(
      store,
      raw.map((edge) => edge.to),
    );
    const lifted = raw.map((edge) => ({
      from: Graph.fileOfSymbol(edge.from),
      to: Graph.fileOfSymbol(declarations.get(edge.to) ?? edge.to),
      kind: edge.kind,
    }));
    // An import of a barrel that `resolveReexports` could not see through names no component; the
    // symbol relations from the same file carry the dependency to what it actually uses.
    const barrels = yield* barrelFiles(store, lifted.flatMap((edge) => [edge.from, edge.to]).filter(isFileIri));
    const edges = lifted.filter(
      ({ from, to }) =>
        from !== to &&
        isFileIri(from) &&
        isFileIri(to) &&
        !barrels.has(from) &&
        !barrels.has(to) &&
        isComponentPath(Graph.pathOf(from, Ontology.FILE_BASE)) &&
        isComponentPath(Graph.pathOf(to, Ontology.FILE_BASE)),
    );
    return Graph.dedupe(edges);
  });

/** Most files one seed package contributes as siblings; a bigger package is reached by the walk instead. */
const MAX_SIBLINGS = 60;

/**
 * Walks out from the seeds. A package holding two or more seeds contributes its other source files
 * first, since a question that lands twice in one package is usually about that package. Hop one
 * then ranks every neighbour by how it links, whether it matches the prompt and whether it shares a
 * seed's package, and may fill at most half the remaining room; hop two takes only nodes linked to
 * at least two members already in the set. Both limits exist because a hub seed that everything
 * imports would otherwise fill the whole budget with its importers.
 */
export const expand = (
  store: Store.Api,
  seedList: readonly Seed[],
  {
    prompt = '',
    maxNodes = 300,
    hops = 2,
    relations = DEFAULT_RELATIONS,
  }: Omit<ExploreOptions, 'prompt' | 'seeds'> & { prompt?: string } = {},
): Effect.Effect<{ nodes: Map<string, { why: string; hops: number }>; edges: Graph.Edge[] }, Store.StoreError> =>
  Effect.gen(function* () {
    const query = Text.query(prompt);
    const nodes = new Map<string, { why: string; hops: number }>();
    for (const seed of seedList) {
      nodes.set(seed.iri, { why: `seed: ${seed.why}`, hops: 0 });
    }
    const seedPackages = new Map<string, number>();
    for (const seed of seedList) {
      const dir = packageDir(Graph.pathOf(seed.iri, Ontology.FILE_BASE));
      if (dir !== undefined) {
        seedPackages.set(dir, (seedPackages.get(dir) ?? 0) + 1);
      }
    }
    const shared = [...seedPackages.entries()].filter(([, count]) => count >= 2).map(([dir]) => dir);
    if (shared.length > 0) {
      const files = yield* store.listFiles({ language: 'typescript' });
      for (const dir of shared) {
        const siblings = files
          .map((file) => file.path)
          .filter((path) => path.startsWith(`${dir}/src/`) && isComponentPath(path))
          .sort((left, right) => Text.match(query, right) - Text.match(query, left))
          .slice(0, MAX_SIBLINGS);
        for (const path of siblings) {
          const iri = Ontology.fileIri(path).value;
          if (!nodes.has(iri) && nodes.size < maxNodes) {
            nodes.set(iri, { why: `in seed package ${dir}`, hops: 1 });
          }
        }
      }
    }
    const inSeedPackage = (iri: string) => {
      const dir = packageDir(Graph.pathOf(iri, Ontology.FILE_BASE));
      return dir !== undefined && seedPackages.has(dir);
    };
    let frontier = [...nodes.keys()];
    const allEdges: Graph.Edge[] = [];
    for (let hop = 1; hop <= hops && frontier.length > 0 && nodes.size < maxNodes; hop++) {
      const edges = yield* edgesTouching(store, frontier, relations);
      allEdges.push(...edges);
      const links = new Map<string, { count: number; kinds: Set<string> }>();
      for (const edge of edges) {
        for (const [near, far] of [
          [edge.from, edge.to],
          [edge.to, edge.from],
        ]) {
          if (nodes.has(near) && !nodes.has(far)) {
            const entry = links.get(far) ?? { count: 0, kinds: new Set<string>() };
            entry.count++;
            entry.kinds.add(edge.kind);
            links.set(far, entry);
          }
        }
      }
      const minimum = hop === 1 ? 1 : 2;
      // Framework relations outrank plain imports: a file that provides a seed's service is closer
      // to the answer than one that merely imports it.
      const weight = (iri: string, entry: { count: number; kinds: Set<string> }) =>
        entry.count +
        ([...entry.kinds].some((kind) => kind !== 'imports' && kind !== 'implDependsOn') ? 2 : 0) +
        3 * Text.match(query, Graph.pathOf(iri, Ontology.FILE_BASE)) +
        (inSeedPackage(iri) ? 2 : 0);
      const ranked = [...links.entries()]
        .filter(([, entry]) => entry.count >= minimum)
        .map(([iri, entry]) => ({ iri, entry, weight: weight(iri, entry) }))
        .sort((left, right) => right.weight - left.weight)
        .map(({ iri, entry }) => [iri, entry] as const);
      const room = hop < hops ? Math.ceil((maxNodes - nodes.size) / 2) : maxNodes - nodes.size;
      const added = ranked.slice(0, room).map(([iri, entry]) => {
        nodes.set(iri, { why: `${[...entry.kinds].join('/')} of ${entry.count} candidate(s)`, hops: hop });
        return iri;
      });
      frontier = added;
    }
    // Seeds and seed-package siblings arrive without an edge test, so a barrel can still be here.
    const barrels = yield* barrelFiles(store, [...nodes.keys()]);
    if (barrels.size < nodes.size) {
      for (const iri of barrels) {
        nodes.delete(iri);
      }
      frontier = frontier.filter((iri) => !barrels.has(iri));
    }
    // The edges among the final set, including those between nodes added on the last hop.
    const lastEdges = frontier.length > 0 ? yield* edgesTouching(store, frontier, relations) : [];
    const edges = Graph.dedupe([...allEdges, ...lastEdges]).filter(
      (edge) => nodes.has(edge.from) && nodes.has(edge.to),
    );
    return { nodes, edges };
  });

/** The derived class a symbol carries, preferred over its syntactic kind as a card's `kind`. */
const CLASS_PRIORITY = [
  'Plugin',
  'EffectService',
  'EffectLayer',
  'Operation',
  'OperationHandlerSet',
  'OperationHandler',
  'Capability',
  'Skill',
  'Rpc',
  'EchoType',
  'EchoRelation',
  'DomainError',
  'Schema',
];

const SNIPPET_LIMIT = 600;

/** Cards for a set of files: package, primary declaration, doc, snippet. */
export const cards = (
  store: Store.Api,
  entries: Map<string, { why: string; hops: number }>,
  edges: readonly Graph.Edge[],
): Effect.Effect<Graph.NodeCard[], Store.StoreError> =>
  Effect.gen(function* () {
    const iris = [...entries.keys()];
    const packages = new Map<string, { name?: string; path?: string }>();
    type Declaration = {
      name: string;
      kind: string;
      classes: Set<string>;
      doc?: string;
      snippet?: string;
      exported: boolean;
    };
    const declarations = new Map<string, Map<string, Declaration>>();

    for (const batch of chunks(iris, 50)) {
      const rows = yield* store.select(`PREFIX deus: <${D}>
        SELECT ?file ?pkgName ?pkgPath WHERE {
          VALUES ?file { ${values(batch)} }
          ?file deus:inPackage ?pkg . ?pkg deus:name ?pkgName . OPTIONAL { ?pkg deus:packagePath ?pkgPath }
        }`);
      for (const row of rows) {
        packages.set(row.file, { name: row.pkgName, path: row.pkgPath });
      }
      const symbols = yield* store.select(`PREFIX deus: <${D}>
        SELECT ?file ?symbol ?name ?kind ?class ?doc ?snippet ?exported WHERE {
          VALUES ?file { ${values(batch)} }
          ?file deus:declares ?symbol . ?symbol deus:name ?name ; deus:kind ?kind .
          OPTIONAL { ?symbol deus:exported ?exported }
          OPTIONAL { ?symbol a ?class . FILTER(STRSTARTS(STR(?class), "${D}") && ?class != deus:Symbol) }
          OPTIONAL { ?symbol deus:doc ?doc }
          OPTIONAL { ?symbol deus:snippet ?snippet }
        }`);
      for (const row of symbols) {
        const byName = declarations.get(row.file) ?? new Map<string, Declaration>();
        declarations.set(row.file, byName);
        const entry = byName.get(row.symbol) ?? {
          name: row.name,
          kind: row.kind,
          classes: new Set<string>(),
          doc: row.doc,
          snippet: row.snippet,
          exported: row.exported === 'true',
        };
        if (row.class) {
          entry.classes.add(row.class.slice(D.length));
        }
        byName.set(row.symbol, entry);
      }
    }

    const degree = Graph.degrees(edges);
    return iris.map((iri) => {
      const path = Graph.pathOf(iri, Ontology.FILE_BASE);
      const owner = packages.get(iri);
      const declared = [...(declarations.get(iri)?.values() ?? [])];
      const classed = (entry: Declaration) => {
        const index = Math.min(
          ...[...entry.classes].map((name) => CLASS_PRIORITY.indexOf(name)).filter((value) => value >= 0),
        );
        return Number.isFinite(index) ? index : CLASS_PRIORITY.length;
      };
      // The primary declaration: a framework-classified export first, then a class, then any export.
      const ranked = declared
        .filter((entry) => entry.exported)
        .sort(
          (left, right) =>
            classed(left) - classed(right) ||
            Number(right.kind === 'class') - Number(left.kind === 'class') ||
            Number(Boolean(right.doc)) - Number(Boolean(left.doc)),
        );
      const primary = ranked[0];
      const primaryClass = primary
        ? ([...primary.classes].sort(
            (left, right) => CLASS_PRIORITY.indexOf(left) - CLASS_PRIORITY.indexOf(right),
          )[0] ?? primary.kind)
        : 'file';
      const stem = basename(path).replace(/\.(m|c)?tsx?$/, '');
      const normal = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');
      // A barrel is named for its directory; otherwise the primary declaration names the file when it
      // is what the file is about (a classified symbol, a class, or the file's own name).
      const label =
        stem === 'index'
          ? basename(path.replace(/\/(src\/)?index\.(m|c)?tsx?$/, ''))
          : primary && (primary.classes.size > 0 || primary.kind === 'class' || normal(primary.name) === normal(stem))
            ? primary.name
            : stem;
      const entry = entries.get(iri);
      return {
        iri,
        label,
        kind: primaryClass,
        path,
        ...(owner?.name ? { package: owner.name } : {}),
        ...(Graph.areaOf(owner?.path) ? { area: Graph.areaOf(owner?.path) } : {}),
        symbols: ranked.slice(0, 8).map((declaration) => declaration.name),
        ...(primary?.doc ? { doc: primary.doc } : {}),
        ...(primary?.snippet ? { snippet: primary.snippet.slice(0, SNIPPET_LIMIT) } : {}),
        inDegree: degree.get(iri)?.in ?? 0,
        outDegree: degree.get(iri)?.out ?? 0,
        why: entry?.why ?? '',
        hops: entry?.hops ?? 0,
      } satisfies Graph.NodeCard;
    });
  });

/** The deterministic explorer: text-matched seeds, then a breadth-first walk over a fixed relation set. */
export const bfs =
  ({ prompt, maxNodes = 300, seeds: seedCount = 12, hops = 2, relations = DEFAULT_RELATIONS }: ExploreOptions) =>
  (store: Store.Api): Effect.Effect<Graph.Candidates, Store.StoreError> =>
    Effect.gen(function* () {
      const found = yield* seeds(store, prompt, seedCount);
      return yield* fromSeeds(store, { prompt, explorer: 'bfs', seeds: found, maxNodes, hops, relations });
    });

/** Candidates from a seed list and relation set — the walk both explorers share. */
export const fromSeeds = (
  store: Store.Api,
  options: {
    readonly prompt: string;
    readonly explorer: string;
    readonly seeds: readonly Seed[];
    readonly maxNodes: number;
    readonly hops: number;
    readonly relations: readonly Graph.EdgeKind[];
  },
): Effect.Effect<Graph.Candidates, Store.StoreError> =>
  Effect.gen(function* () {
    const { nodes, edges } = yield* expand(store, options.seeds, options);
    const nodeCards = yield* cards(store, nodes, edges);
    return {
      prompt: options.prompt,
      explorer: options.explorer,
      seeds: options.seeds.map((seed) => seed.iri),
      nodes: nodeCards,
      edges,
    };
  });
