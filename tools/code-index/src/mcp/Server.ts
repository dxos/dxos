//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as McpProtocol from 'effect/ai/McpProtocol';
import * as McpServer from 'effect/ai/McpServer';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { join } from 'node:path';

import * as Cache from '../design/Cache.ts';
import * as Design from '../design/Design.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Term from '../worker/types/Term.ts';
import * as Sandbox from '../workspace/Sandbox.ts';
import * as Lock from './Lock.ts';

/**
 * `code-index mcp`: a read-only MCP server over stdio, so an MCP client can query the index the
 * way the workspace agent does. It opens an existing store and never indexes or writes.
 */

/** The namespaces of `design/ONTOLOGY.md`, which every tool description refers to. */
export const NAMESPACES: Readonly<Record<string, string>> = {
  deus: Ontology.PREFIX,
  file: Ontology.FILE_BASE,
  pkg: Ontology.PACKAGE_BASE,
  module: Ontology.MODULE_BASE,
  graph: Ontology.GRAPH_BASE,
  type: Ontology.TYPE_BASE,
  lib: Term.LIB_BASE,
  rdf: Ontology.prefixes.rdf,
  rdfs: Ontology.prefixes.rdfs,
  xsd: Ontology.prefixes.xsd,
};

const DEUS = `PREFIX deus: <${Ontology.PREFIX}>`;

export const QUERY_DEFAULT_LIMIT = 200;
export const QUERY_MAX_LIMIT = 2_000;
export const DESCRIBE_DEFAULT_LIMIT = 50;
export const DESCRIBE_MAX_LIMIT = 500;
export const FILES_DEFAULT_LIMIT = 500;
export const FILES_MAX_LIMIT = 5_000;

/** Candidates listed when a name matches several resources, rather than describing one at random. */
const MAX_CANDIDATES = 20;

const clamp = (value: number | undefined, fallback: number, max: number): number =>
  Math.min(Math.max(1, Math.floor(value ?? fallback)), max);

/**
 * Bounds a SELECT at the store: the backends materialise every row, so an unbounded query against
 * millions of quads must be cut off by the engine, not by slicing afterwards. A trailing LIMIT is
 * lowered to the cap; with none, one is appended on its own line so a trailing comment cannot
 * swallow it.
 */
export const boundQuery = (sparql: string, limit: number): string => {
  const trailing = /((?:\s+(?:LIMIT|OFFSET)\s+\d+)+)\s*$/i.exec(sparql);
  const modifiers = trailing?.[1] ?? '';
  if (!/LIMIT/i.test(modifiers)) {
    return `${sparql}\nLIMIT ${limit}`;
  }
  const lowered = modifiers.replace(/LIMIT\s+(\d+)/i, (_, value: string) => `LIMIT ${Math.min(Number(value), limit)}`);
  return `${sparql.slice(0, trailing?.index ?? sparql.length)}${lowered}`;
};

/** Only names SPARQL accepts as a prefixed name's local part are compacted, so output pastes back into a query. */
const LOCAL_NAME = /^[A-Za-z_][A-Za-z0-9_-]*$/;

export const compact = (iri: string): string => {
  for (const [prefix, base] of Object.entries(NAMESPACES)) {
    if (iri.startsWith(base) && LOCAL_NAME.test(iri.slice(base.length))) {
      return `${prefix}:${iri.slice(base.length)}`;
    }
  }
  return iri;
};

/** A full IRI, `<…>` or a `prefix:` name over {@link NAMESPACES}; anything else is a name to resolve. */
export const expand = (target: string): string | undefined => {
  const trimmed = target.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    return trimmed.slice(1, -1);
  }
  if (/^(https?|urn):/.test(trimmed)) {
    return trimmed;
  }
  const colon = trimmed.indexOf(':');
  if (colon > 0) {
    const base = NAMESPACES[trimmed.slice(0, colon)];
    if (base !== undefined) {
      return `${base}${trimmed.slice(colon + 1)}`;
    }
  }
  return undefined;
};

/** A SPARQL string literal; JSON's escapes are a subset of SPARQL's. */
const literal = (value: string): string => JSON.stringify(value);

//
// Tools.
//

/** A declared failure, so the client receives an `isError` result carrying the message. */
export class ToolFailure extends Schema.TaggedError<ToolFailure>()('ToolFailure', {
  message: Schema.String,
}) {}

const toFailure = (error: { readonly message: string }): ToolFailure => new ToolFailure({ message: error.message });

const PREFIXES_NOTE =
  'Prefixes: deus: = https://dxos.org/vocab/deus# (classes and predicates), file: = https://dxos.org/deus/file/ ' +
  '(files; a symbol is <file IRI>#<name>), pkg: = https://dxos.org/deus/package/ (packages by package.json name), ' +
  'module: = https://dxos.org/deus/module/ (modules as imported, e.g. module:effect/Layer#effect). ' +
  'Every file is its own named graph and the default graph is their union, so patterns need no GRAPH clause.';

const Row = Schema.Record(Schema.String, Schema.String);

export const Query = Tool.make('query', {
  description:
    'Runs a SPARQL SELECT over the code index and returns { vars, rows } (each row maps a variable to its ' +
    'lexical value; unbound variables are absent). Results are capped at `limit` rows (default 200, max 2000) ' +
    'and `truncated` says whether more existed. Call `vocabulary` first to learn which classes and predicates ' +
    `exist. ${PREFIXES_NOTE} Example: PREFIX deus: <https://dxos.org/vocab/deus#> ` +
    'SELECT ?path WHERE { ?file a deus:File ; deus:path ?path ; deus:inPackage <https://dxos.org/deus/package/@dxos/echo> }',
  parameters: Schema.Struct({
    sparql: Schema.String.annotate({ description: 'A SPARQL SELECT query, with its PREFIX declarations.' }),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum rows to return (default 200, max 2000).' })),
  }),
  success: Schema.Struct({
    vars: Schema.Array(Schema.String),
    rows: Schema.Array(Row),
    limit: Schema.Number,
    truncated: Schema.Boolean,
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

export const Ask = Tool.make('ask', {
  description:
    `Runs a SPARQL ASK over the code index and returns { result: boolean }. ${PREFIXES_NOTE} ` +
    'Example: PREFIX deus: <https://dxos.org/vocab/deus#> ' +
    'ASK { <https://dxos.org/deus/file/src/a.ts> deus:imports <https://dxos.org/deus/file/src/b.ts> }',
  parameters: Schema.Struct({
    sparql: Schema.String.annotate({ description: 'A SPARQL ASK query, with its PREFIX declarations.' }),
  }),
  success: Schema.Struct({ result: Schema.Boolean }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const VocabularyTerm = Schema.Struct({
  term: Schema.String.annotate({ description: 'Local name in the deus: namespace, e.g. File or imports.' }),
  kind: Schema.String.annotate({ description: '`class` (used with rdf:type) or `property`.' }),
  count: Schema.Number.annotate({ description: 'Quads using it.' }),
});

export const Vocabulary = Tool.make('vocabulary', {
  description:
    'Lists the deus: classes and predicates the graph actually contains, asserted by the indexer and derived ' +
    'by the N3 rules alike (e.g. EffectLayer, providesService), with how many quads use each, plus the ' +
    'namespace prefixes. Read this before writing SPARQL rather than guessing predicate names. ' +
    `${PREFIXES_NOTE} Example follow-up: PREFIX deus: <https://dxos.org/vocab/deus#> ` +
    'SELECT ?s WHERE { ?s a deus:EffectLayer } LIMIT 10',
  parameters: Tool.EmptyParams,
  success: Schema.Struct({
    prefixes: Schema.Record(Schema.String, Schema.String),
    terms: Schema.Array(VocabularyTerm),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const Outgoing = Schema.Struct({
  predicate: Schema.String,
  object: Schema.String,
  objectKind: Schema.Literals(['iri', 'literal']),
});

const Incoming = Schema.Struct({ subject: Schema.String, predicate: Schema.String });

const Candidate = Schema.Struct({ iri: Schema.String, types: Schema.Array(Schema.String) });

export const Describe = Tool.make('describe', {
  description:
    'Shows one resource of the code index: its outgoing triples (predicate, object) and incoming triples ' +
    '(subject, predicate), each capped at `limit` (default 50, max 500). `target` is an IRI (full, <…>, or ' +
    'prefixed as deus:/file:/pkg:/module:), or a name to resolve: a repository-relative file path, a package ' +
    'name, or a symbol name. A name matching several resources returns them as `candidates` to describe one ' +
    'by IRI. IRIs in the result are compacted only where the prefixed form is valid SPARQL. ' +
    `${PREFIXES_NOTE} Examples: "@dxos/echo", "tools/code-index/src/Store.ts", "pkg:@dxos/echo", ` +
    '"https://dxos.org/deus/file/tools/code-index/src/Store.ts#layer".',
  parameters: Schema.Struct({
    target: Schema.String.annotate({ description: 'An IRI, or a file path, package name or symbol name.' }),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum triples per direction (default 50).' })),
  }),
  success: Schema.Struct({
    iri: Schema.optional(Schema.String),
    candidates: Schema.Array(Candidate),
    outgoing: Schema.Array(Outgoing),
    incoming: Schema.Array(Incoming),
    truncated: Schema.Struct({ outgoing: Schema.Boolean, incoming: Schema.Boolean }),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const FileEntry = Schema.Struct({ path: Schema.String, language: Schema.String, size: Schema.Number });

export const Files = Tool.make('files', {
  description:
    'Lists indexed files (repository-relative paths) with their language and size, optionally filtered by a ' +
    'path prefix and a language (e.g. typescript, json, markdown), capped at `limit` (default 500, max 5000). ' +
    'A file path p has the IRI file:<p>, e.g. https://dxos.org/deus/file/packages/core/echo/echo/src/index.ts. ' +
    'Example: { "prefix": "tools/code-index/src/", "language": "typescript" }',
  parameters: Schema.Struct({
    prefix: Schema.optional(Schema.String.annotate({ description: 'Keep paths starting with this.' })),
    language: Schema.optional(Schema.String.annotate({ description: 'Keep files of this language.' })),
    limit: Schema.optional(Schema.Number.annotate({ description: 'Maximum files to return (default 500).' })),
  }),
  success: Schema.Struct({
    files: Schema.Array(FileEntry),
    total: Schema.Number.annotate({ description: 'Files matching the filters, before the limit.' }),
    truncated: Schema.Boolean,
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

const DerivedGraph = Schema.Struct({
  graph: Schema.String.annotate({ description: 'The graph IRI; graph:derived/<rules file> or graph:pass/<pass>.' }),
  quads: Schema.Number,
});

export const Stats = Tool.make('stats', {
  description:
    'Reports the size of the code index: indexed files, total quads, the quads each reasoner derived (one ' +
    'graph per rules file under https://dxos.org/deus/graph/derived/ and per JS pass under …/graph/pass/), and ' +
    `the backend in use (js or native). ${PREFIXES_NOTE} Example follow-up: PREFIX deus: <https://dxos.org/vocab/deus#> ` +
    'SELECT ?p (COUNT(*) AS ?n) WHERE { GRAPH <https://dxos.org/deus/graph/derived/50-example> { ?s ?p ?o } } GROUP BY ?p',
  parameters: Tool.EmptyParams,
  success: Schema.Struct({
    backend: Schema.String,
    dir: Schema.String,
    files: Schema.Number,
    quads: Schema.Number,
    derived: Schema.Array(DerivedGraph),
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

export const DesignTool = Tool.make('design', {
  description:
    'Answers a design question ("how does the agent runtime wire its services?") with the files that matter and ' +
    "how they connect: explores the index from the prompt, scores every candidate file's relevance (System One " +
    'blended with a text/degree baseline when the server has TYPESAFE_API_KEY, the baseline alone otherwise), ' +
    'prunes to `budget` files (default 30) and returns them best first with their edges, plus a compact mermaid ' +
    'draft of at most 14 boxes with a `%% ref <id> <path>` line per box. Takes a few seconds.',
  parameters: Schema.Struct({
    prompt: Schema.String.annotate({ description: 'The design question, in prose.' }),
    budget: Schema.optional(Schema.Number.annotate({ description: 'Files to keep (default 30).' })),
    threshold: Schema.optional(Schema.Number.annotate({ description: 'Relevance a file needs, 0–1 (default 0.5).' })),
  }),
  success: Schema.Struct({
    scorer: Schema.String,
    grouping: Schema.String,
    nodes: Schema.Array(
      Schema.Struct({
        iri: Schema.String,
        label: Schema.String,
        kind: Schema.String,
        path: Schema.String,
        package: Schema.optional(Schema.String),
        score: Schema.Number,
      }),
    ),
    edges: Schema.Array(Schema.Struct({ from: Schema.String, to: Schema.String, kind: Schema.String })),
    mermaid: Schema.String,
  }),
  failure: ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false)
  .annotate(Tool.Idempotent, true);

export const CodeIndexToolkit = Toolkit.make(Query, Ask, Vocabulary, Describe, Files, Stats, DesignTool);

//
// Handlers.
//

/** Counted by the engine, grouped per graph, so no quad is ever materialised to count it. */
const DERIVED_COUNT_QUERY = `SELECT ?graph (COUNT(*) AS ?quads) WHERE {
    GRAPH ?graph { ?s ?p ?o }
    FILTER(STRSTARTS(STR(?graph), '${Ontology.DERIVED_GRAPH_PREFIX}') || STRSTARTS(STR(?graph), '${Ontology.PASS_GRAPH_PREFIX}'))
  } GROUP BY ?graph ORDER BY ?graph`;

/** Every quad read here comes from a store this process holds exclusively, so it cannot change under a cache. */
export const handlers = (store: Store.Api) =>
  Effect.gen(function* () {
    const vocabulary = yield* Effect.cached(Sandbox.readVocabulary(store));
    const derived = yield* Effect.cached(
      store
        .select(DERIVED_COUNT_QUERY)
        .pipe(Effect.map((rows) => rows.map((row) => ({ graph: row.graph, quads: Number(row.quads) })))),
    );

    // Opened on first use; the answers it holds are the design cache, not the (read-only) store.
    const designCache = yield* Effect.cached(Cache.open(join(store.dir, 'design-cache.jsonl')));

    const resolve = (target: string) =>
      Effect.gen(function* () {
        const iri = expand(target);
        if (iri !== undefined) {
          return [iri];
        }
        const rows = yield* store.select(`${DEUS}
          SELECT DISTINCT ?s WHERE {
            { ?s deus:path ${literal(target)} } UNION { ?s deus:name ${literal(target)} }
          } ORDER BY ?s LIMIT ${MAX_CANDIDATES}`);
        return rows.map((row) => row.s);
      });

    const typesOf = (iri: string) =>
      Effect.map(store.select(`SELECT DISTINCT ?type WHERE { <${iri}> a ?type } ORDER BY ?type`), (rows) =>
        rows.map((row) => compact(row.type)),
      );

    return CodeIndexToolkit.of({
      query: ({ sparql, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, QUERY_DEFAULT_LIMIT, QUERY_MAX_LIMIT);
          // One row past the cap is what tells a full page from a truncated one.
          const rows = yield* store.select(boundQuery(sparql, cap + 1));
          const vars = [...new Set(rows.flatMap((row) => Object.keys(row)))];
          return { vars, rows: rows.slice(0, cap), limit: cap, truncated: rows.length > cap };
        }).pipe(Effect.mapError(toFailure)),

      ask: ({ sparql }) =>
        store.ask(sparql).pipe(
          Effect.map((result) => ({ result })),
          Effect.mapError(toFailure),
        ),

      vocabulary: () =>
        vocabulary.pipe(
          Effect.map((terms) => ({ prefixes: { ...NAMESPACES }, terms })),
          Effect.mapError(toFailure),
        ),

      describe: ({ target, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, DESCRIBE_DEFAULT_LIMIT, DESCRIBE_MAX_LIMIT);
          const resolved = yield* resolve(target);
          const none = { outgoing: [], incoming: [], truncated: { outgoing: false, incoming: false } };
          if (resolved.length !== 1) {
            const candidates = yield* Effect.forEach(resolved, (iri) =>
              Effect.map(typesOf(iri), (types) => ({ iri, types })),
            );
            return { candidates, ...none };
          }
          const [iri] = resolved;
          if (/[<>"{}|^`\\\s]/.test(iri)) {
            return yield* Effect.fail(new ToolFailure({ message: `Not a valid IRI: ${iri}` }));
          }
          const outgoing = yield* store.select(
            `SELECT ?p ?o (isIRI(?o) AS ?iri) WHERE { <${iri}> ?p ?o } ORDER BY ?p ?o LIMIT ${cap + 1}`,
          );
          const incoming = yield* store.select(`SELECT ?s ?p WHERE { ?s ?p <${iri}> } ORDER BY ?p ?s LIMIT ${cap + 1}`);
          return {
            iri,
            candidates: [],
            outgoing: outgoing.slice(0, cap).map((row) => {
              const isIri = row.iri === 'true';
              return {
                predicate: compact(row.p),
                object: isIri ? compact(row.o) : row.o,
                objectKind: isIri ? ('iri' as const) : ('literal' as const),
              };
            }),
            incoming: incoming.slice(0, cap).map((row) => ({ subject: compact(row.s), predicate: compact(row.p) })),
            truncated: { outgoing: outgoing.length > cap, incoming: incoming.length > cap },
          };
        }).pipe(Effect.mapError(toFailure)),

      files: ({ prefix, language, limit }) =>
        Effect.gen(function* () {
          const cap = clamp(limit, FILES_DEFAULT_LIMIT, FILES_MAX_LIMIT);
          const all = yield* store.listFiles({ language });
          const matching = prefix === undefined ? all : all.filter((file) => file.path.startsWith(prefix));
          return {
            files: matching
              .slice(0, cap)
              .map((file) => ({ path: file.path, language: file.language, size: file.size })),
            total: matching.length,
            truncated: matching.length > cap,
          };
        }).pipe(Effect.mapError(toFailure)),

      design: ({ prompt, budget, threshold }) =>
        designCache.pipe(
          Effect.flatMap((cache) => Design.answer(store, cache, { prompt, budget, threshold })),
          Effect.mapError(toFailure),
        ),

      stats: () =>
        Effect.gen(function* () {
          const counts = yield* store.stats();
          return {
            backend: store.backend,
            dir: counts.dir,
            files: counts.files,
            quads: counts.quads,
            derived: yield* derived,
          };
        }).pipe(Effect.mapError(toFailure)),
    });
  });

//
// Server.
//

export const INSTRUCTIONS =
  'Read-only access to a code index: the files, packages, symbols and relations of one repository as an RDF ' +
  'graph (the DEUS ontology). Start with `vocabulary` to learn the classes and predicates, `describe` to explore ' +
  'a file, package or symbol by name, and `query`/`ask` for SPARQL. ' +
  PREFIXES_NOTE;

export type RunOptions = {
  /** The store directory to open. */
  readonly dir: string;
  readonly backend?: Store.Backend;
  readonly version: string;
};

/** Opens the store read-only for the enclosing scope; a store another process holds fails with that process named. */
export const open = (dir: string, backend?: Store.Backend) =>
  Layer.build(Store.layer(dir, backend, { readOnly: true })).pipe(
    Effect.catchTag('code-index/StoreError', (error) => Lock.explain(dir, error)),
    Effect.map((context) => Context.get(context, Store.Store)),
  );

/** Opens the store, before the transport starts so a failure is reported, then serves until stdin closes. */
export const run = ({ dir, backend, version }: RunOptions) =>
  Effect.gen(function* () {
    const store = yield* open(dir, backend);
    yield* Effect.logInfo(`code-index mcp: serving ${dir} (${store.backend} backend) over stdio`);
    return yield* Layer.launch(
      McpServer.toolkit(CodeIndexToolkit).pipe(
        Layer.provide(CodeIndexToolkit.toLayer(handlers(store))),
        Layer.provide(
          McpServer.layerStdio({
            name: 'code-index',
            version,
            instructions: INSTRUCTIONS,
            // A request without a version before `initialize` falls back to the first adapter.
            protocols: [McpProtocol.v2025_06_18, McpProtocol.v2025_03_26, McpProtocol.v2025_11_25],
          }),
        ),
      ),
    );
  });
