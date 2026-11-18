//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Clock from 'effect/Clock';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as Semaphore from 'effect/Semaphore';

import * as Evaluator from '@dxos/brain/Evaluator';
import * as Fact from '@dxos/echo-memory/Fact';
import * as Graph from '@dxos/echo-memory/Graph';
import * as Hash from '@dxos/echo-memory/Hash';
import * as Mapping from '@dxos/echo-memory/Mapping';
import * as MemoryError from '@dxos/echo-memory/MemoryError';
import * as MemoryQuery from '@dxos/echo-memory/MemoryQuery';
import * as MemoryService from '@dxos/echo-memory/MemoryService';
import * as Ontology from '@dxos/echo-memory/Ontology';
import * as RdfStore from '@dxos/echo-memory/RdfStore';
import * as Sparql from '@dxos/echo-memory/Sparql';
import * as Subscription from '@dxos/echo-memory/Subscription';
import * as Vocab from '@dxos/echo-memory/Vocab';

//
// A memory over any RdfStore: facts are quads in the store's shared part, and the memory's own records
// (subscriptions, outboxes, when it last evaluated) are quads in the local part. Every operation is SPARQL and batches
// of writes, so the same memory runs over a store in the page, in a worker, or across RPC.
//

/**
 * Most acknowledged events one subscription remembers: an acknowledged event's record is what stops the same wake
 * from queueing again, but an ongoing watch queues without end, so past this the oldest are forgotten.
 */
export const MAX_EVENTS = 10_000;

/** Statements answered per round trip when loading the graphs a SELECT binds, so no query outgrows a host's limits. */
const LOAD_BATCH = 200;

const MEMORY = 'urn:dxos:memory:';
const RECORD = `${Vocab.SX}record`;
const CURSOR = `${Vocab.SX}cursor`;
const SUBSCRIPTIONS_GRAPH = `${MEMORY}subscriptions`;
const STATE_GRAPH = `${MEMORY}state`;
const EVALUATED_AT = `${MEMORY}state:evaluated-at`;
const outboxGraph = (subscription: string) => `${MEMORY}outbox:${encodeURIComponent(subscription)}`;

const iri = (value: string): MemoryQuery.SparqlTerm => ({ termType: 'NamedNode', value });
const literal = (value: string): MemoryQuery.SparqlTerm => ({ termType: 'Literal', value });

/** SPARQL IRIREF excludes these characters; a UCHAR escape keeps an arbitrary key from breaking a query. */
const iriRef = (value: string): string =>
  `<${[...value]
    .map((char) =>
      char <= ' ' || '<>"{}|^`\\'.includes(char) ? `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}` : char,
    )
    .join('')}>`;

//
// The seed vocabulary every memory starts with (and starts with again once reset), with a marker naming its version
// so a memory written by an older seed is brought up to date.
//

const SEED_QUADS = Ontology.ontologyQuads(Ontology.DEFAULT).map(Sparql.toQuad);
const SEED_IRIS = new Set(SEED_QUADS.map((quad) => quad.s.value));
const SEED_VERSION = Hash.text(SEED_QUADS.map((quad) => `${quad.s.value} ${quad.p.value} ${quad.o.value}`).join('\n'));
const seedMarker = (version: string): RdfStore.Quad => ({
  s: iri(Vocab.ONTOLOGY_GRAPH),
  p: iri(Vocab.SX_SEED),
  o: literal(version),
});

/** A cursor lives in the default graph, which a fact query reads only as the provenance of a fact graph. */
const cursorQuad = (source: string, through: string): RdfStore.Quad => ({
  s: iri(`${MEMORY}cursor:${encodeURIComponent(source)}`),
  p: iri(CURSOR),
  o: literal(through),
});

/** One record of the local part: a JSON literal on its own subject, so an update replaces one quad. */
const recordQuad = (graph: string, subject: string, json: unknown): RdfStore.Quad => ({
  s: iri(subject),
  p: iri(RECORD),
  o: literal(JSON.stringify(json)),
  g: iri(graph),
});

const recordsSparql = (graph: string) => `SELECT ?s ?r WHERE { GRAPH ${iriRef(graph)} { ?s ${iriRef(RECORD)} ?r } }`;

/** A SPARQL query's form, read past its prologue and comments; only a SELECT's solutions answer a memory query. */
const isSelect = (sparql: string): boolean =>
  /^\s*SELECT\b/i.test(
    sparql.replace(/#[^\n]*/g, '').replace(/^\s*(?:(?:PREFIX\s+[^:\s]*:\s*<[^>]*>|BASE\s+<[^>]*>)\s*)*/i, ''),
  );

const SubscriptionRecord = Schema.Struct({
  seq: Schema.Number,
  subscription: Subscription.Subscription,
});
const EventRecord = Schema.Struct({
  seq: Schema.Number,
  acked: Schema.Boolean,
  event: Subscription.MemoryEvent,
});
const encodeSubscriptionRecord = Schema.encodeSync(SubscriptionRecord);
const decodeSubscriptionRecord = Schema.decodeUnknownSync(SubscriptionRecord);
const encodeEventRecord = Schema.encodeSync(EventRecord);
const decodeEventRecord = Schema.decodeUnknownSync(EventRecord);

type Stored<T> = { readonly quad: RdfStore.Quad; readonly value: T };

const toRules = (subscription: Subscription.Subscription): Evaluator.Subscription => ({
  id: subscription.id,
  rules: subscription.rules,
  createdAt: subscription.createdAt,
});

const compiles = (rules: Evaluator.Subscription): boolean => {
  try {
    Evaluator.make().add(rules);
    return true;
  } catch {
    return false;
  }
};

/**
 * Opens a MemoryService over the RdfStore. Time-driven rules are evaluated by a fiber in the scope; facts other
 * replicas write wake this memory's subscriptions as the store applies them; a memory reopened after rules came due
 * evaluates them on open.
 */
export const make = (rdf: RdfStore.Service): Effect.Effect<MemoryService.Service, never, Scope.Scope> =>
  Effect.gen(function* () {
    // The memory's time is its host's, read from the clock it was opened with, so a caller's context cannot skew it.
    const clock = yield* Clock.Clock;
    const currentTime = Effect.sync(() => clock.currentTimeMillisUnsafe());
    const lock = yield* Semaphore.make(1);
    const wakeups = yield* Queue.sliding<void>(1);
    /** The batches this memory wrote, which it has already pushed to the evaluator. */
    const own = new Set<string>();

    const attempt = <A>(message: string, thunk: () => A) =>
      Effect.try({ try: thunk, catch: MemoryError.MemoryError.wrap({ message }) });

    //
    // Reads.
    //

    const ontologyQuads = rdf.query(Sparql.ONTOLOGY_SPARQL).pipe(Effect.map(Sparql.rowsToQuads));

    const factsMatching = (pattern: Sparql.Pattern) =>
      Effect.gen(function* () {
        const ontology = yield* ontologyQuads;
        const predicates =
          pattern.predicate === undefined
            ? undefined
            : Sparql.matchingPredicates(
                pattern.predicate,
                Sparql.predicateLabels(
                  (yield* rdf.query(Sparql.STORED_PREDICATES_SPARQL)).flatMap(({ p }) => (p ? [p.value] : [])),
                  ontology,
                ),
              );
        const quads = Sparql.rowsToQuads(
          yield* rdf.query(Sparql.graphQuadsSparql(Sparql.candidateGraphs(pattern, predicates))),
        );
        // A graph found by one statement may hold others, so each is checked against the pattern again.
        return Mapping.triplesToFacts([...quads, ...ontology]).filter((fact) =>
          Sparql.statementMatches(fact, pattern, predicates),
        );
      });

    const factsIn = (graphs: readonly string[]) =>
      Effect.gen(function* () {
        if (graphs.length === 0) {
          return [];
        }
        const quads = [];
        for (let start = 0; start < graphs.length; start += LOAD_BATCH) {
          const batch = Sparql.graphValues(graphs.slice(start, start + LOAD_BATCH));
          quads.push(...Sparql.rowsToQuads(yield* rdf.query(Sparql.graphQuadsSparql(batch))));
        }
        return Mapping.triplesToFacts([...quads, ...(yield* ontologyQuads)]);
      });

    const selectSparql = (
      sparql: string,
      message: string,
    ): Effect.Effect<readonly MemoryQuery.SparqlRow[], MemoryError.MemoryError | RdfStore.RdfStoreError> =>
      isSelect(sparql) ? rdf.query(sparql) : Effect.fail(new MemoryError.MemoryError({ message }));

    const cursorOf = (source: string) =>
      rdf
        .query(`SELECT ?v WHERE { ${iriRef(cursorQuad(source, '').s.value)} ${iriRef(CURSOR)} ?v }`)
        .pipe(Effect.map((rows) => rows.map(({ v }) => v?.value)));

    const records = <T>(graph: string, decode: (json: unknown) => T) =>
      rdf
        .query(recordsSparql(graph), { local: true })
        .pipe(
          Effect.flatMap((rows) =>
            attempt('A memory record does not decode', () =>
              rows.flatMap(({ s, r }): Stored<T>[] =>
                s && r
                  ? [{ quad: { s, p: iri(RECORD), o: r, g: iri(graph) }, value: decode(JSON.parse(r.value)) }]
                  : [],
              ),
            ),
          ),
        );

    const readSubscriptions = records(SUBSCRIPTIONS_GRAPH, decodeSubscriptionRecord).pipe(
      Effect.map((found) => found.sort((left, right) => left.value.seq - right.value.seq)),
    );

    const readEvaluatedAt = rdf
      .query(`SELECT ?v WHERE { GRAPH ${iriRef(STATE_GRAPH)} { ${iriRef(EVALUATED_AT)} ${iriRef(RECORD)} ?v } }`, {
        local: true,
      })
      .pipe(Effect.map(([row]) => (row?.v === undefined ? undefined : Number(JSON.parse(row.v.value)))));

    //
    // Writes.
    //

    /** Writes the shared part and remembers the batch as this memory's own, so its changes are not pushed twice. */
    const writeShared = (writes: readonly RdfStore.Write[]) =>
      rdf.write(writes).pipe(Effect.tap((id) => Effect.sync(() => own.add(id))));

    const saveEvaluatedAt = (at: number) =>
      Effect.gen(function* () {
        const [old] = yield* rdf.query(
          `SELECT ?v WHERE { GRAPH ${iriRef(STATE_GRAPH)} { ${iriRef(EVALUATED_AT)} ${iriRef(RECORD)} ?v } }`,
          { local: true },
        );
        const writes: RdfStore.Write[] = [];
        if (old?.v) {
          writes.push({
            _tag: 'delete',
            quads: [{ s: iri(EVALUATED_AT), p: iri(RECORD), o: old.v, g: iri(STATE_GRAPH) }],
          });
        }
        writes.push({ _tag: 'insert', quads: [recordQuad(STATE_GRAPH, EVALUATED_AT, at)] });
        yield* rdf.write(writes, { local: true });
      });

    /** Brings the seed vocabulary up to date: a memory written by another seed has its seed predicates rewritten. */
    const seed = Effect.gen(function* () {
      const [marker] = yield* rdf.query(Sparql.SEED_MARKER_SPARQL);
      if (marker?.v?.value === SEED_VERSION) {
        return;
      }
      const stale = (yield* ontologyQuads).filter((quad) => SEED_IRIS.has(quad.subject.value)).map(Sparql.toQuad);
      yield* writeShared([
        { _tag: 'delete', quads: [...stale, ...(marker?.v ? [seedMarker(marker.v.value)] : [])] },
        { _tag: 'insert', quads: [...SEED_QUADS, seedMarker(SEED_VERSION)] },
      ]);
    });

    /** Queues the events not queued before (acknowledged or not); returns how many were new. */
    const enqueue = (events: readonly Evaluator.Event[]) =>
      Effect.gen(function* () {
        const subscribed = new Set<string>((yield* readSubscriptions).map(({ value }) => value.subscription.id));
        const bySubscription = new Map<string, Evaluator.Event[]>();
        for (const event of events) {
          if (subscribed.has(event.subscription)) {
            bySubscription.set(event.subscription, [...(bySubscription.get(event.subscription) ?? []), event]);
          }
        }
        let queued = 0;
        for (const [subscription, wakes] of bySubscription) {
          const graph = outboxGraph(subscription);
          const outbox = yield* records(graph, decodeEventRecord);
          const known = new Set(outbox.map(({ value }) => value.event.id));
          let seq = outbox.reduce((max, { value }) => Math.max(max, value.seq), 0);
          const inserts: RdfStore.Quad[] = [];
          for (const wake of wakes) {
            if (known.has(Subscription.MemoryEventId.make(wake.id))) {
              continue;
            }
            known.add(Subscription.MemoryEventId.make(wake.id));
            const event: Subscription.MemoryEvent = {
              id: Subscription.MemoryEventId.make(wake.id),
              subscription: Subscription.SubscriptionId.make(subscription),
              label: wake.label,
              facts: wake.facts,
              at: new Date(wake.at).toISOString(),
            };
            inserts.push(
              recordQuad(
                graph,
                `${graph}/${encodeURIComponent(wake.id)}`,
                encodeEventRecord({ seq: ++seq, acked: false, event }),
              ),
            );
          }
          // Past the cap, the oldest acknowledged events are forgotten.
          const acked = outbox
            .filter(({ value }) => value.acked)
            .sort((left, right) => left.value.seq - right.value.seq);
          const forget = acked
            .slice(0, Math.max(0, outbox.length + inserts.length - MAX_EVENTS))
            .map(({ quad }) => quad);
          if (inserts.length > 0 || forget.length > 0) {
            yield* rdf.write(
              [
                { _tag: 'delete', quads: forget },
                { _tag: 'insert', quads: inserts },
              ],
              { local: true },
            );
          }
          queued += inserts.length;
        }
        return queued;
      });

    //
    // The rule evaluator, rebuilt from the store: the subscriptions and the stored facts, replayed as of the last
    // evaluation and emitting nothing. A subscription whose rules no longer compile is left out rather than failing.
    //

    const hydrate = Effect.gen(function* () {
      const facts = yield* factsMatching({});
      const at = (yield* readEvaluatedAt) ?? (yield* currentTime);
      const subscriptions = (yield* readSubscriptions).map(({ value }) => toRules(value.subscription)).filter(compiles);
      const evaluator = Evaluator.make();
      evaluator.hydrate(
        subscriptions,
        [...facts].sort((left, right) =>
          left.attribution.generatedAtTime.localeCompare(right.attribution.generatedAtTime),
        ),
        at,
      );
      return evaluator;
    });

    const evaluator = { current: Evaluator.make() };

    /** Evaluates the time-driven rules as of now, queues what woke, and records the time. */
    const tick = Effect.gen(function* () {
      const at = yield* currentTime;
      const queued = yield* enqueue(evaluator.current.tick(at));
      yield* saveEvaluatedAt(at);
      return queued;
    });

    const push = Effect.fnUntraced(function* (facts: readonly Fact.Fact[], quiet?: readonly string[]) {
      if (facts.length === 0) {
        return 0;
      }
      const at = yield* currentTime;
      const queued = yield* enqueue(evaluator.current.push(facts, { at, quiet }));
      yield* saveEvaluatedAt(at);
      return queued;
    });

    /** Starts the rule state over with no facts; the subscriptions are added back so they keep waking. */
    const restart = Effect.gen(function* () {
      const at = yield* currentTime;
      const fresh = Evaluator.make();
      fresh.hydrate(
        (yield* readSubscriptions).map(({ value }) => toRules(value.subscription)).filter(compiles),
        [],
        at,
      );
      evaluator.current = fresh;
      yield* saveEvaluatedAt(at);
    });

    /** A batch another replica wrote: a clear starts the rules over, and the facts it adds are pushed. */
    const applyRemote = Effect.fnUntraced(function* (batch: RdfStore.Batch) {
      if (own.delete(batch.id)) {
        return;
      }
      if (batch.writes.some((write) => write._tag === 'clear')) {
        yield* restart;
      }
      const graphs = new Set(
        batch.writes.flatMap((write) =>
          write._tag === 'insert'
            ? write.quads.flatMap(({ g }) => (g && g.value !== Vocab.ONTOLOGY_GRAPH ? [g.value] : []))
            : [],
        ),
      );
      yield* push(yield* factsIn([...graphs]));
    });

    // Following the store starts before hydrating, so no batch applied in between goes unseen.
    const applied = yield* Queue.unbounded<RdfStore.Batch>();
    yield* rdf.listen((batch) => {
      Queue.offerUnsafe(applied, batch);
    });
    yield* Effect.forkScoped(
      Effect.forever(
        Queue.take(applied).pipe(
          Effect.flatMap((batch) => lock.withPermit(applyRemote(batch))),
          Effect.andThen(Queue.offer(wakeups, undefined)),
          Effect.catchCause((cause) => Effect.logError('Failed to apply a batch another replica wrote', cause)),
        ),
      ),
    );

    yield* lock
      .withPermit(
        Effect.gen(function* () {
          yield* seed;
          evaluator.current = yield* hydrate;
          // Catches up on rules that came due while the memory was closed.
          yield* tick;
        }),
      )
      .pipe(Effect.orDie);

    yield* Effect.forkScoped(
      Effect.forever(
        Effect.gen(function* () {
          const due = evaluator.current.nextDueAt();
          if (due === undefined) {
            yield* Queue.take(wakeups);
            return;
          }
          const now = yield* currentTime;
          const woken = yield* Effect.raceFirst(
            Effect.as(Queue.take(wakeups), true),
            Effect.as(Effect.sleep(Duration.millis(Math.max(0, due - now))), false),
          );
          if (!woken) {
            yield* lock.withPermit(tick);
          }
        }).pipe(
          // A failed tick must not end the fiber, which would silently stop every time-driven rule.
          Effect.catchCause((cause) => Effect.logError('Failed to evaluate time-driven rules', cause)),
        ),
      ),
    );

    const writing = <A, E>(effect: Effect.Effect<A, E>) =>
      lock.withPermit(effect).pipe(Effect.tap(() => Queue.offer(wakeups, undefined)));

    const queryRaw = (query: MemoryQuery.Any): Effect.Effect<unknown, unknown> => {
      switch (query._tag) {
        case 'facts':
          return factsMatching(query.pattern);
        case 'graphs':
          return selectSparql(query.sparql, 'A graphs query takes a SPARQL SELECT').pipe(
            Effect.flatMap((rows) => factsIn(Sparql.boundGraphs(rows))),
          );
        case 'sparql':
          return selectSparql(query.sparql, 'A sparql query takes a SPARQL SELECT');
        case 'predicates':
          return ontologyQuads.pipe(Effect.map(Ontology.fromQuads));
        case 'cursor':
          return cursorOf(query.source).pipe(Effect.map(([through]) => through));
      }
    };

    const service: MemoryService.Service = {
      put: (facts, options) =>
        writing(
          Effect.gen(function* () {
            const described = new Set(
              (yield* rdf.query(Sparql.DESCRIBED_PREDICATES_SPARQL)).flatMap(({ s }) => (s ? [s.value] : [])),
            );
            // A predicate's provenance records when, by what and from which quote it was first minted, not every use.
            const quads = [
              ...facts.flatMap((fact) => Mapping.factToTriples(fact)),
              ...Graph.mintedPredicates(facts)
                .filter(({ iri: predicate }) => !described.has(predicate))
                .flatMap(Ontology.toQuads),
            ].map(Sparql.toQuad);
            const writes: RdfStore.Write[] = [{ _tag: 'insert', quads }];
            // Moved in the same batch as the facts, so a failed put is read again rather than skipped.
            if (options?.read) {
              const old = yield* cursorOf(options.read.source);
              writes.push(
                {
                  _tag: 'delete',
                  quads: old.flatMap((through) =>
                    through === undefined ? [] : [cursorQuad(options.read?.source ?? '', through)],
                  ),
                },
                { _tag: 'insert', quads: [cursorQuad(options.read.source, options.read.through)] },
              );
            }
            yield* writeShared(writes);
            return yield* push(facts, options?.quiet);
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to put facts' }))),

      query: (query) =>
        queryRaw(query).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(MemoryQuery.resultOf(query))),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: `Failed to answer a ${query._tag} query` })),
        ),

      reset: () =>
        writing(
          Effect.gen(function* () {
            yield* writeShared([
              { _tag: 'clear' },
              { _tag: 'insert', quads: [...SEED_QUADS, seedMarker(SEED_VERSION)] },
            ]);
            const outboxes = (yield* readSubscriptions).map(({ value }) => outboxGraph(value.subscription.id));
            for (const graph of outboxes) {
              const events = yield* records(graph, decodeEventRecord);
              yield* rdf.write([{ _tag: 'delete', quads: events.map(({ quad }) => quad) }], { local: true });
            }
            yield* restart;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to reset memory' }))),

      subscribe: (subscription) =>
        writing(
          Effect.gen(function* () {
            const existing = yield* readSubscriptions;
            const others = existing.filter(({ value }) => value.subscription.id !== subscription.id);
            if (others.length >= Subscription.MAX_SUBSCRIPTIONS) {
              return false;
            }
            const rules = toRules(subscription);
            const current = evaluator.current.subscriptions.find(({ id }) => id === subscription.id);
            // Re-subscribing unchanged keeps the evaluator's state, so an achieved goal stays achieved.
            if (current?.rules !== rules.rules || current?.createdAt !== rules.createdAt) {
              yield* attempt('The subscription rules do not compile', () => evaluator.current.add(rules));
            }
            const previous = existing.find(({ value }) => value.subscription.id === subscription.id);
            const seq = previous?.value.seq ?? existing.reduce((max, { value }) => Math.max(max, value.seq), 0) + 1;
            yield* rdf.write(
              [
                { _tag: 'delete', quads: previous ? [previous.quad] : [] },
                {
                  _tag: 'insert',
                  quads: [
                    recordQuad(
                      SUBSCRIPTIONS_GRAPH,
                      `${SUBSCRIPTIONS_GRAPH}/${encodeURIComponent(subscription.id)}`,
                      encodeSubscriptionRecord({ seq, subscription }),
                    ),
                  ],
                },
              ],
              { local: true },
            );
            return true;
          }),
        ).pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to subscribe' }))),

      subscriptions: (owner) =>
        readSubscriptions.pipe(
          Effect.map((found) =>
            found
              .map(({ value }) => value.subscription)
              .filter((subscription) => owner === undefined || subscription.owner === owner),
          ),
          Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to list subscriptions' })),
        ),

      unsubscribe: (id) =>
        lock
          .withPermit(
            Effect.gen(function* () {
              const found = (yield* readSubscriptions).filter(({ value }) => value.subscription.id === id);
              const events = yield* records(outboxGraph(id), decodeEventRecord);
              yield* rdf.write(
                [{ _tag: 'delete', quads: [...found.map(({ quad }) => quad), ...events.map(({ quad }) => quad)] }],
                { local: true },
              );
              evaluator.current.remove(id);
              return found.length > 0;
            }),
          )
          .pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to unsubscribe' }))),

      take: (id) =>
        // Rules that came due since the timer last ran are evaluated first, so a drain sees everything due by now.
        lock
          .withPermit(
            Effect.gen(function* () {
              const due = evaluator.current.nextDueAt();
              if (due !== undefined && due <= (yield* currentTime)) {
                yield* tick;
              }
            }),
          )
          .pipe(
            Effect.andThen(records(outboxGraph(id), decodeEventRecord)),
            Effect.map((outbox) =>
              outbox
                .filter(({ value }) => !value.acked)
                .sort((left, right) => left.value.seq - right.value.seq)
                .map(({ value }) => value.event),
            ),
            Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to read the outbox' })),
          ),

      ack: (id, events) =>
        lock
          .withPermit(
            Effect.gen(function* () {
              const acking = new Set<string>(events);
              const graph = outboxGraph(id);
              const pending = (yield* records(graph, decodeEventRecord)).filter(
                ({ value }) => !value.acked && acking.has(value.event.id),
              );
              if (pending.length === 0) {
                return;
              }
              yield* rdf.write(
                [
                  { _tag: 'delete', quads: pending.map(({ quad }) => quad) },
                  {
                    _tag: 'insert',
                    quads: pending.map(({ quad, value }) =>
                      recordQuad(graph, quad.s.value, encodeEventRecord({ ...value, acked: true })),
                    ),
                  },
                ],
                { local: true },
              );
            }),
          )
          .pipe(Effect.mapError(MemoryError.MemoryError.wrap({ message: 'Failed to acknowledge events' }))),
    };

    return service;
  });

/** A MemoryService over the RdfStore in context. */
export const layer: Layer.Layer<MemoryService.MemoryService, never, RdfStore.RdfStore> = Layer.effect(
  MemoryService.MemoryService,
  RdfStore.RdfStore.pipe(Effect.flatMap(make)),
);
