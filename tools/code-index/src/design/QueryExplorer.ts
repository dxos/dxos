//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Tool from 'effect/ai/Tool';
import * as Toolkit from 'effect/ai/Toolkit';
import * as Clock from 'effect/Clock';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Sparql from '../mcp/Sparql.ts';
import * as Terms from '../mcp/Terms.ts';
import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Explore from './Explore.ts';
import * as Graph from './Graph.ts';

/**
 * The query explorer: a small model writes a handful of SPARQL queries against the index, using the
 * same vocabulary the MCP server documents, and every file any of them returns becomes a candidate.
 * The union, not one query, is the candidate set, so a query that misses is harmless as long as
 * another finds the part; selection (`Select.ts`) is what keeps the result precise.
 */

/** Where a candidate came from: the query that returned it, by its index and stated purpose. */
export type QueryRecord = {
  readonly index: number;
  readonly purpose: string;
  readonly sparql: string;
  readonly ok: boolean;
  readonly rows: number;
  readonly ms: number;
  /** File IRIs the rows named, in row order. */
  readonly files: readonly string[];
  readonly error?: string;
};

export type ExploreOptions = {
  readonly prompt: string;
  /** Queries the model may run; past this every call is refused. */
  readonly maxQueries?: number;
  /** Rows one query may return; the engine is asked for no more. */
  readonly maxRows?: number;
  /** How long one query may run before it is cancelled and reported to the model. */
  readonly queryTimeout?: Duration.Input;
  /** Wall-clock budget for the whole exploration, model turns included. */
  readonly timeBudget?: Duration.Input;
  /** Upper bound on candidates. */
  readonly maxNodes?: number;
  /** Files outside the query results that may join as bridges between them. */
  readonly maxBridges?: number;
};

export type Exploration = {
  readonly candidates: Graph.Candidates;
  readonly queries: readonly QueryRecord[];
  /** Set when the model could not be used and the text-match seeds alone were explored. */
  readonly fallback?: string;
};

export const DEFAULT_MAX_QUERIES = 8;
export const DEFAULT_MAX_ROWS = 200;

/** Rows of one result shown back to the model; the rest are counted, not shown. */
const SHOWN_ROWS = 25;

/** The source label of the text-match seeds, which join the union as query 0. */
export const TEXT_MATCH = 'text match over paths, declarations and docs';

const SparqlTool = Tool.make('sparql', {
  description:
    'Runs one SPARQL SELECT over the code index and returns how many rows matched and the first rows. ' +
    'Every file IRI in any row (or a symbol IRI, which is its file plus `#name`) becomes a candidate.',
  parameters: Schema.Struct({
    purpose: Schema.String.annotate({ description: 'What this query looks for, in a few words.' }),
    query: Schema.String.annotate({
      description: 'A SPARQL SELECT with a LIMIT. Prefixes deus:, file:, pkg: are known.',
    }),
  }),
  success: Schema.Struct({ ok: Schema.Boolean, rows: Schema.Number, output: Schema.String }),
});

class ExploreToolkit extends Toolkit.make(SparqlTool) {}

/** The documented terms, minus the positional families (`passes0`…), which only add noise here. */
const vocabulary = (): string =>
  Object.entries(Terms.TERMS)
    .filter(([name]) => !/\d$/.test(name))
    .map(([name, term]) =>
      term.kind === 'class'
        ? `- class deus:${name}: ${term.description}`
        : `- deus:${name} (${term.subjectClass ?? '?'} → ${term.range ?? '?'}): ${term.description}`,
    )
    .join('\n');

export const systemPrompt = (maxQueries: number, maxRows: number): string =>
  [
    'You explore an RDF index of a TypeScript monorepo to find the source files a developer question is about,',
    'so a later stage can draw an architecture diagram of them. You call the `sparql` tool; you show nothing to',
    'the user.',
    '',
    `Run between 3 and ${maxQueries} queries, each with LIMIT ${maxRows} or less, each one approaching the question`,
    'from a different angle: names of the concepts, docs that mention them, the packages involved, the framework',
    'classes (services, layers, operations, plugins, capabilities) that implement them, and what those depend on.',
    'Return ?file bindings wherever you can: file IRIs (and symbol IRIs, which are a file IRI plus `#name`) are',
    'what is collected. A query that fails comes back with its error; fix it and go on. Stop calling the tool',
    'once you have covered the question, then reply with one sentence.',
    '',
    `Files are <${Ontology.FILE_BASE}<repo path>>, packages <${Ontology.PACKAGE_BASE}<name>>. Text filters look like`,
    "FILTER(CONTAINS(LCASE(?name), 'runtime')); combine them with || and &&, never OR/AND. Prefer bound",
    'predicates and LIMITs over property paths.',
    '',
    'Example:',
    'SELECT DISTINCT ?file ?name WHERE { ?file deus:declares ?symbol . ?symbol deus:exported true ;',
    "  deus:name ?name . FILTER(CONTAINS(LCASE(?name), 'queue')) } LIMIT 100",
    '',
    'Vocabulary:',
    vocabulary(),
  ].join('\n');

const isSourcePath = (path: string): boolean =>
  /\.(m|c)?tsx?$/.test(path) && !/(\.d\.ts$|\/dist\/|\/node_modules\/)/.test(path);

/** The file IRIs a result row names: file and symbol IRIs, and repo paths given as literals. */
export const filesOf = (row: Store.Binding): string[] => {
  const files: string[] = [];
  for (const value of Object.values(row)) {
    const iri = value.startsWith(Ontology.FILE_BASE)
      ? Graph.fileOfSymbol(value)
      : isSourcePath(value) && !value.includes(' ') && !value.startsWith('/')
        ? Ontology.fileIri(value).value
        : undefined;
    if (iri !== undefined && isSourcePath(Graph.pathOf(iri, Ontology.FILE_BASE)) && !files.includes(iri)) {
      files.push(iri);
    }
  }
  return files;
};

export type Union = Map<string, { readonly sources: readonly number[] }>;

/**
 * Every file the successful queries returned, with the queries that returned it. When there are
 * more than `maxNodes`, files more queries agree on go first, then earlier rows, since a query
 * orders its own results by relevance more often than not.
 */
export const union = (queries: readonly QueryRecord[], maxNodes: number): Union => {
  const found = new Map<string, { sources: number[]; first: number }>();
  let order = 0;
  for (const record of queries) {
    if (!record.ok) {
      continue;
    }
    for (const iri of record.files) {
      const entry = found.get(iri) ?? { sources: [], first: order++ };
      if (!entry.sources.includes(record.index)) {
        entry.sources.push(record.index);
      }
      found.set(iri, entry);
    }
  }
  const ranked = [...found.entries()].sort(
    ([, left], [, right]) => right.sources.length - left.sources.length || left.first - right.first,
  );
  return new Map(ranked.slice(0, maxNodes).map(([iri, { sources }]) => [iri, { sources }]));
};

/**
 * Files outside the union linked to at least two of its members, most linked first: what joins two
 * parts the queries found separately, and so what keeps the selected subgraph connected.
 */
export const bridges = (
  members: ReadonlySet<string>,
  edges: readonly Graph.Edge[],
  max: number,
): Map<string, number> => {
  const links = new Map<string, Set<string>>();
  for (const edge of edges) {
    for (const [near, far] of [
      [edge.from, edge.to],
      [edge.to, edge.from],
    ]) {
      if (members.has(near) && !members.has(far)) {
        links.set(far, (links.get(far) ?? new Set()).add(near));
      }
    }
  }
  return new Map(
    [...links.entries()]
      .filter(([, near]) => near.size >= 2)
      .sort(([, left], [, right]) => right.size - left.size)
      .slice(0, max)
      .map(([iri, near]) => [iri, near.size]),
  );
};

/** Prefixed IRIs in what the model reads back, so a row costs a few tokens rather than a URL each. */
const compact = (value: string): string => {
  for (const [prefix, base] of Object.entries(Sparql.NAMESPACES)) {
    if (value.startsWith(base)) {
      return `${prefix}:${value.slice(base.length)}`;
    }
  }
  return value;
};

const render = (rows: readonly Store.Binding[]): string =>
  rows
    .slice(0, SHOWN_ROWS)
    .map((row) =>
      Object.entries(row)
        .map(([name, value]) => `${name}=${compact(value).slice(0, 120)}`)
        .join(' '),
    )
    .join('\n') + (rows.length > SHOWN_ROWS ? `\n… ${rows.length - SHOWN_ROWS} more rows` : '');

const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * The parser's error plus the fix for the mistakes models make most, since "expected NOT at 6:46"
 * alone does not tell a model that SPARQL spells OR as `||`.
 */
export const hint = (sparql: string, error: string): string => {
  const syntax = sparql.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, ' ');
  const fixes = [
    ...(/\b(OR|AND)\b/.test(syntax) ? ['SPARQL writes OR as || and AND as &&.'] : []),
    ...(/\bLIKE\b/i.test(syntax)
      ? ['There is no LIKE; use CONTAINS(LCASE(?x), "word") or REGEX(?x, "word", "i").']
      : []),
  ];
  return fixes.length > 0 ? `${error} (${fixes.join(' ')})` : error;
};

const byIndex = (records: readonly QueryRecord[]): QueryRecord[] =>
  [...records].sort((left, right) => left.index - right.index);

/** Runs one model-written query, bounded in rows and time; a failure is a record, never an error. */
export const runQuery = (
  store: Store.Api,
  { index, purpose, sparql }: { index: number; purpose: string; sparql: string },
  { maxRows, timeout }: { maxRows: number; timeout: Duration.Input },
): Effect.Effect<{ record: QueryRecord; rows: readonly Store.Binding[] }> =>
  Effect.gen(function* () {
    const started = yield* Clock.currentTimeMillis;
    const prepared = Sparql.boundQuery(Sparql.withPrefixes(sparql).sparql, maxRows);
    const result = yield* store.select(prepared).pipe(
      Effect.timeoutOption(timeout),
      Effect.map((rows) =>
        Option.match(rows, {
          onNone: () => ({
            ok: false as const,
            error: `timed out after ${Duration.format(Duration.fromInputUnsafe(timeout))}; narrow the query`,
          }),
          onSome: (value) => ({ ok: true as const, rows: value }),
        }),
      ),
      Effect.catch((cause) => Effect.succeed({ ok: false as const, error: hint(sparql, describe(cause)) })),
    );
    const ms = (yield* Clock.currentTimeMillis) - started;
    if (!result.ok) {
      return { record: { index, purpose, sparql, ok: false, rows: 0, ms, files: [], error: result.error }, rows: [] };
    }
    return {
      record: { index, purpose, sparql, ok: true, rows: result.rows.length, ms, files: result.rows.flatMap(filesOf) },
      rows: result.rows,
    };
  });

/**
 * Lets the model run its queries, within the query, row and time bounds. Returns every query it ran,
 * failures included; a model error ends the loop with whatever was gathered and is reported.
 */
export const gather = (
  store: Store.Api,
  {
    prompt,
    maxQueries = DEFAULT_MAX_QUERIES,
    maxRows = DEFAULT_MAX_ROWS,
    queryTimeout = Duration.seconds(20),
    timeBudget = Duration.seconds(90),
  }: ExploreOptions,
): Effect.Effect<{ queries: QueryRecord[]; error?: string }, never, LanguageModel.LanguageModel> =>
  Effect.gen(function* () {
    const queries: QueryRecord[] = [];
    // Calls of one round-trip may run concurrently, so each takes its index before it awaits anything.
    let issued = 0;
    const deadline = (yield* Clock.currentTimeMillis) + Duration.toMillis(timeBudget);
    const handlers = ExploreToolkit.toLayer({
      sparql: Effect.fn(function* ({ purpose, query }) {
        if (issued >= maxQueries) {
          return { ok: false, rows: 0, output: `Query budget of ${maxQueries} spent; reply with one sentence now.` };
        }
        const index = ++issued;
        const { record, rows } = yield* runQuery(
          store,
          { index, purpose, sparql: query },
          { maxRows, timeout: queryTimeout },
        );
        queries.push(record);
        return record.ok
          ? { ok: true, rows: record.rows, output: record.rows === 0 ? '(no rows)' : render(rows) }
          : { ok: false, rows: 0, output: `Error: ${record.error ?? 'unknown'}` };
      }),
    });

    let conversation = Prompt.make([
      { role: 'system', content: systemPrompt(maxQueries, maxRows) },
      { role: 'user', content: [{ type: 'text', text: prompt }] },
    ]);
    // Each round-trip may call the tool several times; a step cap of its own guards a model that
    // keeps replying with refused calls once the query budget is spent.
    for (let step = 0; step < maxQueries + 2 && issued < maxQueries; step++) {
      const remaining = deadline - (yield* Clock.currentTimeMillis);
      if (remaining <= 0) {
        break;
      }
      const response = yield* LanguageModel.generateText({ prompt: conversation, toolkit: ExploreToolkit }).pipe(
        Effect.provide(handlers),
        Effect.timeoutOption(Duration.millis(remaining)),
        Effect.map(Option.getOrUndefined),
        Effect.catch((cause) => Effect.succeed(describe(cause))),
      );
      if (response === undefined) {
        break;
      }
      if (typeof response === 'string') {
        return { queries: byIndex(queries), error: response };
      }
      if (response.toolCalls.length === 0) {
        break;
      }
      conversation = Prompt.concat(conversation, Prompt.fromResponseParts(response.content));
    }
    return { queries: byIndex(queries) };
  });

/**
 * Explores: the text-match seeds and the model's queries are unioned, bridges between their results
 * are added, and every file gets a card. Without a usable model the text-match seeds stand alone,
 * and the result says why.
 */
export const explore = (
  options: ExploreOptions,
): Effect.Effect<Exploration, Store.StoreError, Store.Store | LanguageModel.LanguageModel> =>
  Effect.gen(function* () {
    const store = yield* Store.Store;
    const { prompt, maxNodes = 300, maxBridges = 40 } = options;
    const started = yield* Clock.currentTimeMillis;
    const seeds = yield* Explore.seeds(store, prompt);
    const textMatch: QueryRecord = {
      index: 0,
      purpose: TEXT_MATCH,
      sparql: '',
      ok: true,
      rows: seeds.length,
      ms: (yield* Clock.currentTimeMillis) - started,
      files: seeds.map((seed) => seed.iri),
    };
    const gathered = yield* gather(store, options);
    if (gathered.error !== undefined) {
      // The union still holds the text-match seeds and any query that ran, so the run goes on, said out loud.
      yield* Console.error(`The explorer model failed after ${gathered.queries.length} queries: ${gathered.error}`);
    }
    const queries = [textMatch, ...gathered.queries];
    const found = union(queries, maxNodes);
    const fallback =
      gathered.queries.every((record) => !record.ok) && gathered.error !== undefined ? gathered.error : undefined;
    return {
      candidates: yield* toCandidates(store, prompt, queries, found, maxBridges),
      queries,
      ...(fallback ? { fallback } : {}),
    };
  });

/** Cards and edges for the union plus its bridges, with each card's sources as its provenance. */
export const toCandidates = (
  store: Store.Api,
  prompt: string,
  queries: readonly QueryRecord[],
  found: Union,
  maxBridges: number,
): Effect.Effect<Graph.Candidates, Store.StoreError> =>
  Effect.gen(function* () {
    const members = new Set(found.keys());
    const touching = yield* Explore.edgesTouching(store, [...members], Explore.DEFAULT_RELATIONS);
    const joined = bridges(members, touching, maxBridges);
    const purpose = new Map(queries.map((record) => [record.index, record.purpose]));
    const entries = new Map<string, { why: string; hops: number }>();
    for (const [iri, { sources }] of found) {
      entries.set(iri, {
        why: sources
          .map((index) => (index === 0 ? TEXT_MATCH : `query ${index}: ${purpose.get(index) ?? ''}`))
          .join('; '),
        hops: 0,
      });
    }
    for (const [iri, count] of joined) {
      entries.set(iri, { why: `bridge between ${count} found files`, hops: 1 });
    }
    // The bridges' own edges to each other were not fetched with the members', so they are added here.
    const bridgeEdges =
      joined.size > 0 ? yield* Explore.edgesTouching(store, [...joined.keys()], Explore.DEFAULT_RELATIONS) : [];
    const edges = Graph.dedupe([...touching, ...bridgeEdges]).filter(
      (edge) => entries.has(edge.from) && entries.has(edge.to),
    );
    const cards = yield* Explore.cards(store, entries, edges);
    return {
      prompt,
      explorer: 'query',
      seeds: [...members],
      nodes: cards.map((card) => ({
        ...card,
        provenance: found.get(card.iri)?.sources.map((index) => (index === 0 ? TEXT_MATCH : `query ${index}`)) ?? [
          'bridge',
        ],
      })),
      edges,
    };
  });
