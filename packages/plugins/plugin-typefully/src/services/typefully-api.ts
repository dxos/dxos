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
import { EffectEx } from '@dxos/effect';
import { Publisher } from '@dxos/plugin-blogger/types';
import { type Connection } from '@dxos/plugin-connector/types';

import { TYPEFULLY_CONNECTOR_ID, TYPEFULLY_SOURCE } from '../constants';

// Verified against the Typefully v1 API docs (https://support.typefully.com/en/articles/8718287-typefully-api
// and the v1 reference): base host with the `/v1/drafts/` path.
const TYPEFULLY_API_URL = 'https://api.typefully.com';
const USER_AGENT = '@dxos/plugin-typefully';

/** Stored as `AccessToken.token`; sent as `X-API-KEY: Bearer <token>` (the verified Typefully v1 auth scheme). */
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

/**
 * Permissive view of a Typefully v1 draft. The v1 API returns a numeric `id` and
 * carries the body under `content`; some responses echo it as `text`. We accept
 * either and normalise to the provider-neutral {@link Publisher.PublisherDraft}.
 */
const TypefullyDraftResponse = Schema.Struct({
  'id': Schema.Union(Schema.Number, Schema.String),
  'content': Schema.optional(Schema.NullOr(Schema.String)),
  'text': Schema.optional(Schema.NullOr(Schema.String)),
  'title': Schema.optional(Schema.NullOr(Schema.String)),
  'share_url': Schema.optional(Schema.NullOr(Schema.String)),
  'scheduled-date': Schema.optional(Schema.NullOr(Schema.String)),
});
type TypefullyDraftResponse = Schema.Schema.Type<typeof TypefullyDraftResponse>;

const toPublisherDraft = (raw: TypefullyDraftResponse): Publisher.PublisherDraft => ({
  id: String(raw.id),
  text: raw.text ?? raw.content ?? '',
  title: raw.title ?? undefined,
  url: raw.share_url ?? undefined,
  scheduledAt: raw['scheduled-date'] ?? undefined,
});

//
// Request pipeline
//

type TypefullyEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException,
  HttpClient.HttpClient | TypefullyCredentials
>;

const shouldRetry = (
  error: HttpClientError.HttpClientError | ParseResult.ParseError | Cause.TimeoutException,
): boolean => {
  if (error instanceof ParseResult.ParseError) {
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
    HttpClientRequest.setHeader('X-API-KEY', `Bearer ${creds.token}`),
    HttpClientRequest.setHeader('Content-Type', 'application/json'),
    HttpClientRequest.setHeader('User-Agent', USER_AGENT),
  );

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
      Effect.flatMap((response) => Effect.flatMap(response.json, Schema.decodeUnknown(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

//
// API surface
//

/** Create a draft — POST `/v1/drafts/`. Maps the draft body markdown to Typefully's `content`. */
const createDraftEffect = (input: Publisher.PublisherDraftInput): TypefullyEffect<Publisher.PublisherDraft> => {
  const body: Record<string, unknown> = { content: input.text };
  if (input.scheduledAt) {
    body['schedule-date'] = input.scheduledAt;
  }
  return execute(
    HttpClientRequest.post(`${TYPEFULLY_API_URL}/v1/drafts/`).pipe(HttpClientRequest.bodyUnsafeJson(body)),
    TypefullyDraftResponse,
  ).pipe(Effect.map(toPublisherDraft));
};

/**
 * List drafts — GET `/v1/drafts/recently-published/`. The v1 API exposes no
 * general "list all drafts" endpoint; recently-published is its closest list.
 */
const listDraftsEffect = (): TypefullyEffect<Publisher.PublisherDraft[]> =>
  execute(
    HttpClientRequest.get(`${TYPEFULLY_API_URL}/v1/drafts/recently-published/`),
    Schema.Array(TypefullyDraftResponse),
  ).pipe(Effect.map((drafts) => drafts.map(toPublisherDraft)));

//
// Service
//

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
      Effect.provide(FetchHttpClient.layer),
      Effect.provide(Database.layer(db)),
    ),
  );
};

/**
 * Typefully implementation of blogger's {@link Publisher.PublisherService}.
 *
 * The Typefully v1 REST API supports creating drafts (POST `/v1/drafts/`) and
 * reading recently-published drafts (GET `/v1/drafts/recently-published/`). It
 * has NO get-by-id, update or delete endpoint — v2 (Dec 2025) adds full CRUD but
 * scopes every draft under a `social_set_id` the connection does not carry — so
 * those three verbs reject with {@link Publisher.PublisherError} rather than
 * fabricate an endpoint.
 */
export const makeTypefullyPublisherService = (): Publisher.PublisherService => ({
  id: TYPEFULLY_CONNECTOR_ID,
  label: 'Typefully',
  source: TYPEFULLY_SOURCE,
  connectorId: TYPEFULLY_CONNECTOR_ID,
  listDrafts: (connection) => runConnection(connection, listDraftsEffect()),
  createDraft: (connection, input) => runConnection(connection, createDraftEffect(input)),
  // The Typefully v1 API has no get-draft-by-id endpoint.
  getDraft: () => Promise.reject(new Publisher.PublisherError('getDraft is not supported by the Typefully v1 API.')),
  // The Typefully v1 API has no update-draft endpoint.
  updateDraft: () =>
    Promise.reject(new Publisher.PublisherError('updateDraft is not supported by the Typefully v1 API.')),
  // The Typefully v1 API has no delete-draft endpoint.
  deleteDraft: () =>
    Promise.reject(new Publisher.PublisherError('deleteDraft is not supported by the Typefully v1 API.')),
});
