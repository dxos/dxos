//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { Database, Obj, type Ref } from '@dxos/echo';
import { proxyFetchLegacy } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { Publisher } from '@dxos/plugin-blogger/types';
import { type Connection } from '@dxos/plugin-connector/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';

// Typefully API v2 (v1 key access was disabled Dec 2025 — see the v1→v2 migration guide:
// https://support.typefully.com/en/articles/13133296-typefully-api-v1-v2-migration-guide). Drafts are
// scoped under a `social_set_id`; auth is `Authorization: Bearer <token>` (v1 keys are rejected by v2).
const TYPEFULLY_API_URL = 'https://api.typefully.com/v2';

/** Stored as `AccessToken.token`; sent as `Authorization: Bearer <token>` (the Typefully v2 auth scheme). */
type TypefullyCredentialsValue = {
  token: string;
};

//
// Credentials service
//

/**
 * Layer-based credentials service. Mirrors plugin-linear's pattern: every API
 * call pulls the token from this service rather than threading it through as an
 * explicit parameter. Typefully uses a static API key (not OAuth), stored on the
 * connection's linked `AccessToken`.
 */
export class TypefullyCredentials extends Context.Tag('@dxos/plugin-typefully/TypefullyCredentials')<
  TypefullyCredentials,
  TypefullyCredentialsValue
>() {
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
    Layer.effect(
      TypefullyCredentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        return { token: accessToken.token };
      }),
    );
}

//
// Response schema + mapping
//

/** We write/read a single platform (see `PLATFORM`); a draft body may be a thread of posts. */
const PLATFORM = 'x';

/** Permissive view of a Typefully v2 draft. Body text lives at `platforms[platform].posts[].text`. */
const TypefullyPostResponse = Schema.Struct({ text: Schema.optional(Schema.NullOr(Schema.String)) });
const TypefullyPlatformResponse = Schema.Struct({
  enabled: Schema.optional(Schema.Boolean),
  posts: Schema.optional(Schema.NullOr(Schema.Array(TypefullyPostResponse))),
});
const TypefullyDraftResponse = Schema.Struct({
  id: Schema.Union(Schema.Number, Schema.String),
  draft_title: Schema.optional(Schema.NullOr(Schema.String)),
  scheduled_date: Schema.optional(Schema.NullOr(Schema.String)),
  // Platform values can be `null` for platforms the draft doesn't target (e.g. `"x_article": null`).
  platforms: Schema.optional(
    Schema.NullOr(Schema.Record({ key: Schema.String, value: Schema.NullOr(TypefullyPlatformResponse) })),
  ),
});
type TypefullyDraftResponse = Schema.Schema.Type<typeof TypefullyDraftResponse>;

/** Envelope for v2 list endpoints (`{ results: [...] }`, paginated). */
const TypefullyListResponse = Schema.Struct({ results: Schema.Array(TypefullyDraftResponse) });

/** Envelope for `GET /social-sets`. `team` is non-null for team-owned sets, null for personal ones. */
const SocialSetsResponse = Schema.Struct({
  results: Schema.Array(
    Schema.Struct({
      id: Schema.Union(Schema.Number, Schema.String),
      name: Schema.optional(Schema.NullOr(Schema.String)),
      team: Schema.optional(
        Schema.NullOr(Schema.Struct({ id: Schema.String, name: Schema.optional(Schema.NullOr(Schema.String)) })),
      ),
    }),
  ),
});

const toPublisherDraft = (raw: TypefullyDraftResponse): Publisher.PublisherDraft => {
  const platforms = raw.platforms ?? {};
  // Prefer the platform we write to; otherwise the first platform carrying posts.
  const platform = platforms[PLATFORM] ?? Object.values(platforms).find((entry) => entry?.posts?.length);
  const text = (platform?.posts ?? [])
    .map((post) => post.text ?? '')
    .filter((value) => value.length > 0)
    .join('\n\n');
  return {
    id: String(raw.id),
    text,
    title: raw.draft_title ?? undefined,
    scheduledAt: raw.scheduled_date ?? undefined,
  };
};

/** Builds a v2 draft request body from provider-neutral input, targeting a single platform. */
const toDraftBody = (input: Publisher.PublisherDraftInput): Record<string, unknown> => ({
  platforms: { [PLATFORM]: { enabled: true, posts: [{ text: input.text }] } },
  ...(input.scheduledAt ? { publish_at: input.scheduledAt } : {}),
});

//
// Request pipeline
//

type TypefullyEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | Publisher.PublisherError,
  HttpClient.HttpClient | TypefullyCredentials
>;

const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException | Publisher.PublisherError,
): boolean => {
  if (error instanceof ParseResult.ParseError || error instanceof Publisher.PublisherError) {
    return false;
  }
  if (Cause.isTimeoutException(error)) {
    return true;
  }
  if (error._tag === 'RequestError') {
    return true;
  }
  if (error.reason !== 'StatusCode') {
    return true;
  }
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

const withAuth = (request: HttpClientRequest.HttpClientRequest, creds: TypefullyCredentialsValue) =>
  request.pipe(
    // v2 auth. Through the DXOS CORS proxy `Authorization` is relayed as `X-Cors-Proxy-Authorization`
    // and restored to `Authorization` upstream, so the Bearer token still reaches Typefully.
    HttpClientRequest.setHeader('Authorization', `Bearer ${creds.token}`),
    HttpClientRequest.setHeader('Content-Type', 'application/json'),
  );

/** Retry transient failures (429/5xx, network, timeout); never retry a decode/publisher error. */
const TYPEFULLY_RETRY = {
  schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
  while: shouldRetry,
};

/**
 * Authenticate, issue, decode, time out and retry a Typefully request. Retries
 * transient failures (429/5xx, network, timeout); never retries a decode error.
 */
const execute = <T>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Schema<T>): TypefullyEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* TypefullyCredentials;
    const client = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    return yield* client.execute(withAuth(request, creds)).pipe(
      // Read the body as text first so a shape mismatch surfaces the actual payload (Typefully's
      // response shape is under-documented) instead of an opaque "Expected ReadonlyArray<…>".
      Effect.flatMap((response) =>
        Effect.flatMap(response.text, (text) =>
          Effect.try({
            try: () => JSON.parse(text) as unknown,
            catch: () => new Publisher.PublisherError(`Typefully returned non-JSON: ${text.slice(0, 500)}`),
          }).pipe(
            Effect.flatMap((json) =>
              Schema.decodeUnknown(schema)(json).pipe(
                Effect.mapError(
                  (error) =>
                    new Publisher.PublisherError(
                      `Typefully response did not match the expected shape (${error}); body: ${text.slice(0, 500)}`,
                    ),
                ),
              ),
            ),
          ),
        ),
      ),
      Effect.timeout('15 seconds'),
      Effect.retry(TYPEFULLY_RETRY),
      Effect.scoped,
    );
  });

/** Issue a request that returns no decodable body (e.g. DELETE); fails on non-2xx. */
const executeVoid = (request: HttpClientRequest.HttpClientRequest): TypefullyEffect<void> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const creds = yield* TypefullyCredentials;
    const client = httpClient.pipe(
      HttpClient.withTracerDisabledWhen(() => true),
      HttpClient.filterStatusOk,
    );
    yield* client
      .execute(withAuth(request, creds))
      .pipe(Effect.timeout('15 seconds'), Effect.retry(TYPEFULLY_RETRY), Effect.scoped, Effect.asVoid);
  });

//
// API surface
//

/**
 * Resolve the social set id every draft is scoped under. Prefer a team-owned set (sync publishes to
 * the team, not the user's personal drafts); fall back to the first set only when the account has no
 * team. NOTE: with multiple teams this picks the first — a Connection/Publication-level selector is a
 * follow-up.
 */
const resolveSocialSetIdEffect = (): TypefullyEffect<string> =>
  execute(HttpClientRequest.get(`${TYPEFULLY_API_URL}/social-sets`), SocialSetsResponse).pipe(
    Effect.flatMap((response) => {
      const set = response.results.find((candidate) => candidate.team != null) ?? response.results[0];
      return set
        ? Effect.succeed(String(set.id))
        : Effect.fail(new Publisher.PublisherError('No Typefully social set is available for this account.'));
    }),
  );

/** Create a draft — POST `/social-sets/{id}/drafts`. */
const createDraftEffect = (input: Publisher.PublisherDraftInput): TypefullyEffect<Publisher.PublisherDraft> =>
  resolveSocialSetIdEffect().pipe(
    Effect.flatMap((socialSetId) =>
      execute(
        HttpClientRequest.post(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts`).pipe(
          HttpClientRequest.bodyUnsafeJson(toDraftBody(input)),
        ),
        TypefullyDraftResponse,
      ),
    ),
    Effect.map(toPublisherDraft),
  );

/** Update a draft — PATCH `/social-sets/{id}/drafts/{draftId}`. */
const updateDraftEffect = (
  id: string,
  input: Publisher.PublisherDraftInput,
): TypefullyEffect<Publisher.PublisherDraft> =>
  resolveSocialSetIdEffect().pipe(
    Effect.flatMap((socialSetId) =>
      execute(
        HttpClientRequest.patch(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts/${id}`).pipe(
          HttpClientRequest.bodyUnsafeJson(toDraftBody(input)),
        ),
        TypefullyDraftResponse,
      ),
    ),
    Effect.map(toPublisherDraft),
  );

/** Get a draft — GET `/social-sets/{id}/drafts/{draftId}`. */
const getDraftEffect = (id: string): TypefullyEffect<Publisher.PublisherDraft> =>
  resolveSocialSetIdEffect().pipe(
    Effect.flatMap((socialSetId) =>
      execute(
        HttpClientRequest.get(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts/${id}`),
        TypefullyDraftResponse,
      ),
    ),
    Effect.map(toPublisherDraft),
  );

/** Delete a draft — DELETE `/social-sets/{id}/drafts/{draftId}`. */
const deleteDraftEffect = (id: string): TypefullyEffect<void> =>
  resolveSocialSetIdEffect().pipe(
    Effect.flatMap((socialSetId) =>
      executeVoid(HttpClientRequest.del(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts/${id}`)),
    ),
  );

/** List drafts — GET `/social-sets/{id}/drafts` (returns the `{ results }` envelope). */
const listDraftsEffect = (): TypefullyEffect<Publisher.PublisherDraft[]> =>
  resolveSocialSetIdEffect().pipe(
    Effect.flatMap((socialSetId) =>
      execute(HttpClientRequest.get(`${TYPEFULLY_API_URL}/social-sets/${socialSetId}/drafts`), TypefullyListResponse),
    ),
    Effect.map((response) => response.results.map(toPublisherDraft)),
  );

//
// Service
//

// Typefully's API does not permit browser CORS (its preflight rejects the `X-API-KEY` header), so
// route requests through the DXOS edge CORS proxy — mirrors plugin-ideogram's `proxyFetchLegacy` use.
// Effect's `FetchHttpClient` calls `fetch(url, init)` with a string url, so a thin adapter suffices.
const proxyFetch: typeof globalThis.fetch = (input, init) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return proxyFetchLegacy(new URL(href), init ?? undefined);
};

const ProxyHttpLayer = FetchHttpClient.layer.pipe(Layer.provide(Layer.succeed(FetchHttpClient.Fetch, proxyFetch)));

/**
 * Resolve the connection's target space database and run `program` with the
 * HTTP client, database and credentials layers provided. The credentials layer
 * itself needs the database (to load the connection + access token), so the
 * database layer is provided outermost so it satisfies both.
 */
const runConnection = <T>(connection: Ref.Ref<Connection.Connection>, program: TypefullyEffect<T>): Promise<T> => {
  const target = connection.target;
  if (!target) {
    return Promise.reject(new Publisher.MissingCredentialError('Connection reference is not resolved.'));
  }
  const db = Obj.getDatabase(target);
  if (!db) {
    return Promise.reject(new Publisher.MissingCredentialError('Connection is not attached to a database.'));
  }
  return EffectEx.runPromise(
    program.pipe(
      Effect.provide(TypefullyCredentials.fromConnection(connection)),
      Effect.provide(ProxyHttpLayer),
      Effect.provide(Database.layer(db)),
    ),
  );
};

/**
 * Typefully implementation of blogger's {@link Publisher.PublisherService}, on the v2 REST API. Every
 * draft is scoped under a `social_set_id` (resolved per call to the account's first social set), and
 * bodies target a single platform ({@link PLATFORM}). Full CRUD is supported: create/get/update/delete
 * a draft and list the social set's drafts.
 */
export const makeTypefullyPublisherService = (): Publisher.PublisherService => ({
  id: TYPEFULLY_CONNECTOR_ID,
  label: 'Typefully',
  source: TYPEFULLY_SOURCE,
  connectorId: TYPEFULLY_CONNECTOR_ID,
  listDrafts: (connection) => runConnection(connection, listDraftsEffect()),
  getDraft: (connection, id) => runConnection(connection, getDraftEffect(id)),
  createDraft: (connection, input) => runConnection(connection, createDraftEffect(input)),
  updateDraft: (connection, id, input) => runConnection(connection, updateDraftEffect(id, input)),
  deleteDraft: (connection, id) => runConnection(connection, deleteDraftEffect(id)),
});
