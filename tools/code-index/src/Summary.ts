//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Ontology from './Ontology.ts';
import type * as Store from './Store.ts';

/**
 * The whole-graph counts behind `vocabulary` and `stats`, computed once at the end of an indexing
 * pass and kept in SQLite `meta`: on this repository each is a scan of two million quads (10–15 s),
 * which a reader would otherwise pay on its first call.
 */

export type VocabularyCount = { readonly term: string; readonly kind: 'class' | 'property'; readonly count: number };

const VocabularyCountSchema = Schema.Struct({
  term: Schema.String,
  kind: Schema.Literals(['class', 'property']),
  count: Schema.Number,
});

const SummarySchema = Schema.Struct({
  /** What the counts were taken over; see {@link stamp}. */
  stamp: Schema.String,
  files: Schema.Number,
  quads: Schema.Number,
  derived: Schema.Array(Schema.Struct({ graph: Schema.String, quads: Schema.Number })),
  vocabulary: Schema.Array(VocabularyCountSchema),
});

export type Summary = Schema.Schema.Type<typeof SummarySchema>;

const SummaryJson = Schema.fromJsonString(SummarySchema);

const META_KEY = 'summary';

/**
 * What the graph actually contains, rather than what the indexer asserts. The distinction matters:
 * the classes and relations an agent most wants — `EffectLayer`, `providesService` — are concluded
 * by the N3 rules and appear nowhere in the JSON-LD context.
 */
const VOCABULARY_QUERY = `PREFIX deus: <${Ontology.PREFIX}>
  SELECT ?kind ?term (COUNT(*) AS ?count) WHERE {
    { ?s a ?term . BIND('class' AS ?kind) }
    UNION
    { ?s ?term ?o . BIND('property' AS ?kind) }
    FILTER(STRSTARTS(STR(?term), '${Ontology.PREFIX}'))
  } GROUP BY ?kind ?term`;

/** Locale-independent, so a summary recorded on one machine compares equal on another. */
const compareCodeUnits = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

/**
 * Classes first, then by count descending, then by name: a total order, so a recorded summary equals a
 * live count of the same graph. Sorted here rather than by `ORDER BY`, which neither backend applies to
 * ties alike from one evaluation to the next.
 */
const byKindCountTerm = (left: VocabularyCount, right: VocabularyCount): number =>
  compareCodeUnits(left.kind, right.kind) || right.count - left.count || compareCodeUnits(left.term, right.term);

/** The `deus:` classes and predicates in the graph by local name, counted by a whole-graph scan. */
export const readVocabulary = (store: Store.Api): Effect.Effect<VocabularyCount[], Store.StoreError> =>
  store.select(VOCABULARY_QUERY).pipe(
    Effect.map((rows) =>
      rows
        .map((row) => ({
          term: row.term.slice(Ontology.PREFIX.length),
          kind: row.kind === 'class' ? ('class' as const) : ('property' as const),
          count: Number(row.count),
        }))
        .sort(byKindCountTerm),
    ),
  );

/**
 * Every fact write advances the generation and every reasoning pass rewrites the `reasoned` marker,
 * so the pair changes whenever any count could.
 */
const stamp = (store: Store.Api): Effect.Effect<string, Store.StoreError> =>
  Effect.gen(function* () {
    const generation = yield* store.generation();
    const reasoned = yield* store.getMeta('reasoned');
    return `${generation}:${reasoned ?? ''}`;
  });

/** Counts the store as it stands; the slow half of every function here. */
export const compute = (store: Store.Api): Effect.Effect<Summary, Store.StoreError> =>
  Effect.gen(function* () {
    const current = yield* stamp(store);
    const { files, quads } = yield* store.stats();
    const derived = yield* store.derivedGraphCounts();
    const vocabulary = yield* readVocabulary(store);
    return { stamp: current, files, quads, derived, vocabulary };
  });

/** The recorded summary, if it was taken over the store as it stands now. */
export const read = (store: Store.Api): Effect.Effect<Summary | undefined, Store.StoreError> =>
  Effect.gen(function* () {
    const raw = yield* store.getMeta(META_KEY);
    if (raw === undefined) {
      return undefined;
    }
    // One written by an older layout is as good as missing.
    const summary = yield* Schema.decodeUnknownEffect(SummaryJson)(raw).pipe(Effect.orElseSucceed(() => undefined));
    return summary !== undefined && summary.stamp === (yield* stamp(store)) ? summary : undefined;
  });

/** Recomputes and records the summary unless the recorded one is still current. */
export const refresh = (store: Store.Api): Effect.Effect<Summary, Store.StoreError> =>
  Effect.gen(function* () {
    const recorded = yield* read(store);
    if (recorded !== undefined) {
      return recorded;
    }
    const summary = yield* compute(store);
    // A summary this module just built always encodes; a failure here is a bug, not a store error.
    const encoded = yield* Schema.encodeEffect(SummaryJson)(summary).pipe(Effect.orDie);
    yield* store.setMeta(META_KEY, encoded);
    return summary;
  });

/** The recorded summary when current, else one computed now and not recorded (a reader cannot write). */
export const load = (store: Store.Api): Effect.Effect<Summary, Store.StoreError> =>
  Effect.flatMap(read(store), (recorded) => (recorded !== undefined ? Effect.succeed(recorded) : compute(store)));
