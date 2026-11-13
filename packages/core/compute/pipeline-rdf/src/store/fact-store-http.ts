//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { SemanticIndexError } from '../errors.ts';
import { Fact } from '../types/index.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

//
// A FactStore over HTTP: `make` is a client that runs in any runtime with `fetch` (a browser story included), and
// `handle` serves any FactStoreApi to it. Each method is a `POST <base>/<method>` whose body holds its arguments and
// whose response is `{ result }`, or `{ error }` with a non-2xx status.
//

const SemanticQuery = Schema.Struct({
  subjectEntity: Schema.optional(Schema.String),
  predicate: Schema.optional(Schema.String),
  entity: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  minConfidence: Schema.optional(Schema.Number),
  current: Schema.optional(Schema.Boolean),
  limit: Schema.optional(Schema.Number),
});

const FactDimension = Schema.Literals([
  'predicate',
  'subject',
  'object',
  'entity',
  'source',
  'agent',
  'factuality',
  'force',
]);

/** One or two dimensions, as {@link FactGrouping} allows. */
const FactAggregate = Schema.Struct({
  by: Schema.Union([Schema.Tuple([FactDimension]), Schema.Tuple([FactDimension, FactDimension])]),
  scope: Schema.optional(SemanticQuery),
  limit: Schema.optional(Schema.Number),
});

const FactGroups = Schema.Array(Schema.Struct({ keys: Schema.Array(Schema.String), count: Schema.Number }));

/** A Map travels as a record: the keys are entity keys and graph IRIs, both strings. */
const Labels = Schema.Record(Schema.String, Schema.String);
const Statuses = Schema.Record(Schema.String, Schema.Literals(['active', 'superseded', 'retracted']));

/** Wire form of `Ontology.Entry`, which is a plain type with no schema of its own. */
const OntologyEntry = Schema.Struct({
  iri: Schema.String,
  name: Schema.String,
  label: Schema.String,
  synonyms: Schema.optional(Schema.Array(Schema.String)),
  description: Schema.optional(Schema.String),
  domain: Schema.optional(Schema.String),
  range: Schema.optional(Schema.String),
  inverse: Schema.optional(Schema.String),
  equivalents: Schema.optional(Schema.Array(Schema.String)),
  definedBy: Schema.optional(Schema.String),
  created: Schema.optional(Schema.String),
  creator: Schema.optional(Schema.String),
  example: Schema.optional(Schema.String),
  replacedBy: Schema.optional(Schema.String),
});

/** Wire form of `SparqlTerm`. */
const SparqlTermSchema = Schema.Union([
  Schema.Struct({ termType: Schema.Literals(['NamedNode', 'BlankNode']), value: Schema.String }),
  Schema.Struct({
    termType: Schema.Literal('Literal'),
    value: Schema.String,
    datatype: Schema.optional(Schema.String),
    language: Schema.optional(Schema.String),
  }),
]);

// The argument and result schemas both sides share: the protocol, method by method.
const Facts = Schema.Array(Fact);
const Predicates = Schema.Array(OntologyEntry);
const Rows = Schema.Array(Schema.Record(Schema.String, SparqlTermSchema));
const Hash = Schema.NullOr(Schema.String);
const Done = Schema.Null;
const PutFactsArgs = Schema.Struct({ facts: Facts });
const QueryArgs = Schema.Struct({ query: SemanticQuery });
const SelectArgs = Schema.Struct({ sparql: Schema.String });
const CursorArgs = Schema.Struct({ source: Schema.String });
const SetCursorArgs = Schema.Struct({ source: Schema.String, hash: Schema.String });
const AggregateArgs = Schema.Struct({ aggregate: FactAggregate });
const EntityLabelsArgs = Schema.Struct({ keys: Schema.Array(Schema.String) });

const METHODS = [
  'putFacts',
  'predicates',
  'query',
  'count',
  'aggregate',
  'entityLabels',
  'statuses',
  'select',
  'rows',
  'cursor',
  'setCursor',
  'clear',
] as const;

type Method = (typeof METHODS)[number];

const isMethod = (name: string): name is Method => METHODS.some((method) => method === name);

const ErrorBody = Schema.Struct({ error: Schema.String });
const ResultBody = Schema.Struct({ result: Schema.Unknown });

/**
 * A FactStore client that forwards every call to a {@link handle} server at `baseUrl` (e.g. `http://localhost:7700`).
 */
export const make = (baseUrl: string): FactStoreApi => {
  const call = <S extends Schema.Constraint & Schema.ConstraintDecoder<unknown>>(
    method: Method,
    args: object,
    result: S,
  ): Effect.Effect<S['Type'], SemanticIndexError> =>
    Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: (signal) =>
          fetch(`${baseUrl.replace(/\/$/, '')}/${method}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(args),
            signal,
          }),
        catch: (cause) => new SemanticIndexError({ message: `Fact server unreachable at ${baseUrl}`, cause }),
      });
      const body: unknown = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: (cause) => new SemanticIndexError({ message: `Fact server sent invalid JSON for ${method}`, cause }),
      });
      if (!response.ok) {
        const detail = Schema.decodeUnknownOption(ErrorBody)(body);
        return yield* Effect.fail(
          new SemanticIndexError({
            message: `Fact server failed ${method} (HTTP ${response.status}): ${detail._tag === 'Some' ? detail.value.error : 'no detail'}`,
          }),
        );
      }
      return yield* Schema.decodeUnknownEffect(ResultBody)(body).pipe(
        Effect.flatMap((envelope) => Schema.decodeUnknownEffect(result)(envelope.result)),
        Effect.mapError(
          (cause) => new SemanticIndexError({ message: `Fact server sent a malformed ${method} result`, cause }),
        ),
      );
    });

  return {
    putFacts: (facts) => call('putFacts', { facts }, Done).pipe(Effect.asVoid),
    predicates: () => call('predicates', {}, Predicates).pipe(Effect.map((entries) => [...entries])),
    query: (query) => call('query', { query }, Facts).pipe(Effect.map((facts) => [...facts])),
    count: (query) => call('count', { query }, Schema.Number),
    aggregate: (aggregate) =>
      call('aggregate', { aggregate }, FactGroups).pipe(
        Effect.map((groups) => groups.map((group) => ({ keys: [...group.keys], count: group.count }))),
      ),
    entityLabels: (keys) =>
      call('entityLabels', { keys }, Labels).pipe(Effect.map((labels) => new Map(Object.entries(labels)))),
    statuses: () => call('statuses', {}, Statuses).pipe(Effect.map((statuses) => new Map(Object.entries(statuses)))),
    select: (sparql) => call('select', { sparql }, Facts).pipe(Effect.map((facts) => [...facts])),
    rows: (sparql) => call('rows', { sparql }, Rows).pipe(Effect.map((rows) => [...rows])),
    cursor: (source) => call('cursor', { source }, Hash).pipe(Effect.map((hash) => hash ?? undefined)),
    setCursor: (source, hash) => call('setCursor', { source, hash }, Done).pipe(Effect.asVoid),
    clear: () => call('clear', {}, Done).pipe(Effect.asVoid),
  };
};

/** Layer of {@link make}. */
export const layer = (baseUrl: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, make(baseUrl));

export type HandleOptions = {
  /**
   * Which browser origins may call the server. Defaults to pages served from this machine (`localhost`, `127.0.0.1`,
   * `[::1]`, `*.localhost`), since the store can be read and cleared and has no other authentication. Requests with no
   * `Origin` header (node clients, curl) are always allowed: a browser always sends one cross-origin.
   */
  readonly allowOrigin?: (origin: string) => boolean;
};

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9.-]+\.localhost)(:\d+)?$/i;

/** Whether `origin` is a page served from this machine. */
export const isLocalOrigin = (origin: string): boolean => LOCAL_ORIGIN.test(origin);

/** CORS headers granting exactly `origin`, so an allowed page (a storybook) may call the server. */
const corsHeaders = (origin: string | null): Record<string, string> => ({
  ...(origin ? { 'access-control-allow-origin': origin } : {}),
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'vary': 'Origin',
});

const json = (status: number, body: unknown, origin: string | null): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
  });

const dispatch = (
  store: FactStoreApi,
  method: Method,
  body: unknown,
): Effect.Effect<unknown, SemanticIndexError | Schema.SchemaError> => {
  switch (method) {
    case 'putFacts':
      return Schema.decodeUnknownEffect(PutFactsArgs)(body).pipe(
        Effect.flatMap(({ facts }) => store.putFacts(facts)),
        Effect.as(null),
      );
    case 'predicates':
      return store.predicates();
    case 'query':
      return Schema.decodeUnknownEffect(QueryArgs)(body).pipe(Effect.flatMap(({ query }) => store.query(query)));
    case 'count':
      return Schema.decodeUnknownEffect(QueryArgs)(body).pipe(Effect.flatMap(({ query }) => store.count(query)));
    case 'aggregate':
      return Schema.decodeUnknownEffect(AggregateArgs)(body).pipe(
        Effect.flatMap(({ aggregate }) => store.aggregate(aggregate)),
      );
    // A Map is not JSON, so both map-valued reads answer with a plain object.
    case 'entityLabels':
      return Schema.decodeUnknownEffect(EntityLabelsArgs)(body).pipe(
        Effect.flatMap(({ keys }) => store.entityLabels(keys)),
        Effect.map((labels) => Object.fromEntries(labels)),
      );
    case 'statuses':
      return store.statuses().pipe(Effect.map((statuses) => Object.fromEntries(statuses)));
    case 'select':
      return Schema.decodeUnknownEffect(SelectArgs)(body).pipe(Effect.flatMap(({ sparql }) => store.select(sparql)));
    case 'rows':
      return Schema.decodeUnknownEffect(SelectArgs)(body).pipe(Effect.flatMap(({ sparql }) => store.rows(sparql)));
    case 'cursor':
      return Schema.decodeUnknownEffect(CursorArgs)(body).pipe(
        Effect.flatMap(({ source }) => store.cursor(source)),
        Effect.map((hash) => hash ?? null),
      );
    case 'setCursor':
      return Schema.decodeUnknownEffect(SetCursorArgs)(body).pipe(
        Effect.flatMap(({ source, hash }) => store.setCursor(source, hash)),
        Effect.as(null),
      );
    case 'clear':
      return store.clear().pipe(Effect.as(null));
  }
};

/**
 * Serves `store` to {@link make} clients: answers one request with its JSON response. Mount it under any path; the
 * method is the last path segment. A browser origin outside `allowOrigin` answers 403 before reaching the store,
 * malformed arguments 400, a store failure 500.
 */
export const handle = (
  store: FactStoreApi,
  request: Request,
  { allowOrigin = isLocalOrigin }: HandleOptions = {},
): Effect.Effect<Response> =>
  Effect.gen(function* () {
    const origin = request.headers.get('origin');
    if (origin !== null && !allowOrigin(origin)) {
      return json(403, { error: `Origin ${origin} may not call this fact store` }, null);
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const method = new URL(request.url).pathname.split('/').pop() ?? '';
    if (request.method !== 'POST' || !isMethod(method)) {
      return json(404, { error: `No fact-store method ${request.method} ${method}` }, origin);
    }
    const body = yield* Effect.tryPromise(() => request.json()).pipe(Effect.orElseSucceed(() => undefined));
    return yield* dispatch(store, method, body ?? {}).pipe(
      Effect.map((result) => json(200, { result }, origin)),
      Effect.catch((error) =>
        Effect.succeed(
          error instanceof SemanticIndexError
            ? json(500, { error: error.message }, origin)
            : json(400, { error: String(error) }, origin),
        ),
      ),
    );
  });
