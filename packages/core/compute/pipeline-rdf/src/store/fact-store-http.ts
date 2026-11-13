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
});

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

// The argument and result schemas both sides share: the protocol, method by method.
const Facts = Schema.Array(Fact);
const Predicates = Schema.Array(OntologyEntry);
const Hash = Schema.NullOr(Schema.String);
const Done = Schema.Null;
const PutFactsArgs = Schema.Struct({ facts: Facts });
const QueryArgs = Schema.Struct({ query: SemanticQuery });
const SelectArgs = Schema.Struct({ sparql: Schema.String });
const CursorArgs = Schema.Struct({ source: Schema.String });
const SetCursorArgs = Schema.Struct({ source: Schema.String, hash: Schema.String });

const METHODS = ['putFacts', 'predicates', 'query', 'select', 'cursor', 'setCursor', 'clear'] as const;

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
    select: (sparql) => call('select', { sparql }, Facts).pipe(Effect.map((facts) => [...facts])),
    cursor: (source) => call('cursor', { source }, Hash).pipe(Effect.map((hash) => hash ?? undefined)),
    setCursor: (source, hash) => call('setCursor', { source, hash }, Done).pipe(Effect.asVoid),
    clear: () => call('clear', {}, Done).pipe(Effect.asVoid),
  };
};

/** Layer of {@link make}. */
export const layer = (baseUrl: string): Layer.Layer<FactStore> => Layer.succeed(FactStore, make(baseUrl));

/** CORS headers, so a page on another origin (a storybook) may call the server. */
const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS_HEADERS } });

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
    case 'select':
      return Schema.decodeUnknownEffect(SelectArgs)(body).pipe(Effect.flatMap(({ sparql }) => store.select(sparql)));
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
 * method is the last path segment. Malformed arguments answer 400, a store failure 500.
 */
export const handle = (store: FactStoreApi, request: Request): Effect.Effect<Response> =>
  Effect.gen(function* () {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const method = new URL(request.url).pathname.split('/').pop() ?? '';
    if (request.method !== 'POST' || !isMethod(method)) {
      return json(404, { error: `No fact-store method ${request.method} ${method}` });
    }
    const body = yield* Effect.tryPromise(() => request.json()).pipe(Effect.orElseSucceed(() => undefined));
    return yield* dispatch(store, method, body ?? {}).pipe(
      Effect.map((result) => json(200, { result })),
      Effect.catch((error) =>
        Effect.succeed(
          error instanceof SemanticIndexError
            ? json(500, { error: error.message })
            : json(400, { error: String(error) }),
        ),
      ),
    );
  });
