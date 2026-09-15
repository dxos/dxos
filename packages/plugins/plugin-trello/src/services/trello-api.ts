//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';

import { Database, type Ref } from '@dxos/echo';
import { type AccessToken, Connection } from '@dxos/link';

import { TRELLO_API_BASE } from '../constants.ts';
import { InvalidTrelloAccessTokenError } from '../errors.ts';

/**
 * Trello API credentials. The `key` is the user's API key; `token` is the
 * user-issued API token. Exposed as the value type behind the
 * {@link TrelloCredentials} service tag below.
 */
type TrelloCredentialsValue = {
  key: string;
  token: string;
};

const TrelloMemberSchema = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  fullName: Schema.String,
  email: Schema.String.pipe(Schema.optional),
});

/** Subset of the authenticated member returned by `GET /members/me`. */
export type TrelloMember = Schema.Schema.Type<typeof TrelloMemberSchema>;

const TrelloBoardSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  closed: Schema.Boolean,
  url: Schema.String,
  shortUrl: Schema.String,
  dateLastActivity: Schema.String,
});

/** Subset of a Trello board returned by `GET /members/me/boards`. */
export type TrelloBoard = Schema.Schema.Type<typeof TrelloBoardSchema>;

const TrelloListSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  closed: Schema.Boolean,
  pos: Schema.Number,
});

/** Subset of a Trello list returned by `GET /boards/{id}/lists`. */
export type TrelloList = Schema.Schema.Type<typeof TrelloListSchema>;

const TrelloCardSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  desc: Schema.String,
  closed: Schema.Boolean,
  idList: Schema.String,
  pos: Schema.Number,
  url: Schema.String,
  shortUrl: Schema.String,
  dateLastActivity: Schema.String,
});

/** Subset of a Trello card returned by `GET /boards/{id}/cards/all`. */
export type TrelloCard = Schema.Schema.Type<typeof TrelloCardSchema>;

/** Fields accepted by `POST /cards`. */
export type CreateCardInput = {
  idList: string;
  name?: string;
  desc?: string;
  pos?: number | 'top' | 'bottom';
};

/** Fields accepted by `PUT /cards/{id}`. */
export type UpdateCardInput = {
  name?: string;
  desc?: string;
  idList?: string;
  closed?: boolean;
  pos?: number | 'top' | 'bottom';
};

/**
 * Trello tokens are stored as a single colon-separated string `<apiKey>:<userToken>`
 * in the `AccessToken.token` field — set this way by the OAuth callback handler in
 * kms-service (`tokenInCallback` providers) so the stored value is self-contained
 * regardless of how the token was obtained (DXOS OAuth flow or manual entry).
 *
 * - apiKey: 32-char hex Trello Power-Up key (identifies the DXOS app to Trello).
 * - userToken: 64-char hex per-user authorization token.
 *
 * Fails with {@link InvalidTrelloAccessTokenError} when the stored token is not
 * exactly two non-empty segments.
 */
/**
 * Splits a stored Trello credential into its `<power-up key>:<user token>` halves.
 * Fails with {@link InvalidTrelloAccessTokenError} when the value is not exactly two non-empty parts.
 */
export const credentialsFromToken = (
  token: string,
): Effect.Effect<TrelloCredentialsValue, InvalidTrelloAccessTokenError> => {
  const parts = token.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return Effect.fail(new InvalidTrelloAccessTokenError());
  }
  const [key, userToken] = parts;
  return Effect.succeed({ key, token: userToken });
};

/**
 * Layer-based credentials service. Mirrors the `GoogleCredentials` pattern in
 * plugin-inbox: every API call pulls creds from this service rather than
 * threading them through as an explicit parameter, so callers compose a
 * single `Effect.provide(TrelloApi.fromConnection(ref))`
 * (with `{ TrelloApi }` from `../services`) at the operation boundary instead
 * of plumbing creds through every call site.
 */
export class TrelloCredentials extends Context.Service<TrelloCredentials, TrelloCredentialsValue>()(
  '@dxos/plugin-trello/TrelloCredentials',
) {}

/** Loads the connection's access token and parses it into `TrelloCredentials`. */
export const fromConnection = (connectionRef: Ref.Ref<Connection.Connection>) =>
  Layer.effect(
    TrelloCredentials,
    Effect.gen(function* () {
      const connection = yield* Database.load(connectionRef);
      const accessToken = yield* Database.load(connection.accessToken);
      return yield* credentialsFromToken(accessToken.token);
    }),
  );

/**
 * Loads the access token directly and parses it into `TrelloCredentials`. Used by callers that
 * only have an external-sync cursor's `spec.source` — the cursor no longer relates to `Connection`.
 */
export const fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>) =>
  Layer.effect(
    TrelloCredentials,
    Effect.gen(function* () {
      const accessToken = yield* Database.load(accessTokenRef);
      return yield* credentialsFromToken(accessToken.token);
    }),
  );

/**
 * Build a Trello request URL params record that includes the auth pair plus
 * any additional query params the caller wants to set.
 */
const authParams = (
  creds: TrelloCredentialsValue,
  extra: Record<string, string | number | boolean | undefined> = {},
) => {
  const out: Record<string, string> = { key: creds.key, token: creds.token };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) {
      out[k] = String(v);
    }
  }
  return out;
};

type TrelloEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError,
  HttpClient.HttpClient | TrelloCredentials
>;

/**
 * Decide whether a Trello request failure is worth retrying.
 *  - Transport / encode / invalid-URL failures: yes (transient by nature).
 *  - 429 (rate limited) and 5xx: yes — exactly the cases retry was designed for.
 *  - 4xx other than 429 (auth, validation, not-found): no — retry just wastes time
 *    and, for 401/403, may exacerbate rate limiting on the same token.
 *  - TimeoutException (the request didn't complete in the allotted window): yes.
 *  - Schema decode failures (`ParseError`): no — payload won't become valid on retry.
 */
const shouldRetry = (error: HttpClientError.HttpClientError | Schema.SchemaError | Cause.TimeoutError): boolean => {
  if (error instanceof Schema.SchemaError) {
    return false;
  }
  if (Cause.isTimeoutError(error)) {
    return true;
  }
  // v4 hangs the specific failure off `HttpClientError.reason`: a transport-level failure is always
  // worth retrying, and a response failure only on 429/5xx.
  if (error.reason._tag !== 'StatusCodeError') {
    return true;
  }
  const status = error.reason.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

/**
 * Common pipeline for Trello requests:
 *  - execute via the injected HttpClient with its tracer disabled (Effect's
 *    tracer adds a `traceparent` header which trips CORS preflight on
 *    api.trello.com — Trello answers the GET fine but doesn't handle the
 *    preflight OPTIONS, so the browser blocks the response. Same workaround
 *    we use for Google's userinfo endpoint).
 *  - parse JSON body with Effect Schema (invalid shapes fail as {@link Schema.SchemaError})
 *  - 15s timeout
 *  - exponential retry with jitter, up to 3 attempts, only on transient failures
 *    (transport errors, 429, 5xx) — never on 4xx auth/validation errors.
 *  - scope the response so its body stream is released even on failure
 */
const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Codec<T>): TrelloEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(
      HttpClient.transformResponse(Effect.provideService(HttpClient.TracerDisabledWhen, () => true)),
    );
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknownEffect(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.upTo({ times: 3 })),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

/**
 * Build a Trello request that pulls credentials from the `TrelloCredentials`
 * service before delegating to {@link runRequest}. All fetch helpers are
 * thin wrappers around this — call sites compose the layer once at the
 * operation boundary instead of threading creds through every call.
 */
const trelloRequest = <T>(
  build: (creds: TrelloCredentialsValue) => HttpClientRequest.HttpClientRequest,
  schema: Schema.Codec<T>,
): TrelloEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* TrelloCredentials;
    return yield* runRequest(build(creds), schema);
  });

/** Returns the authenticated member's identity. */
export const fetchMember = (): TrelloEffect<TrelloMember> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.get(`${TRELLO_API_BASE}/members/me`).pipe(
        HttpClientRequest.setUrlParams(authParams(creds, { fields: 'id,username,fullName,email' })),
      ),
    TrelloMemberSchema,
  );

const TrelloBoardListSchema = Schema.Array(TrelloBoardSchema);

/** Lists all boards the authenticated user can access. */
export const fetchBoards = (): TrelloEffect<ReadonlyArray<TrelloBoard>> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.get(`${TRELLO_API_BASE}/members/me/boards`).pipe(
        HttpClientRequest.setUrlParams(
          authParams(creds, { fields: 'id,name,closed,url,shortUrl,dateLastActivity', filter: 'open' }),
        ),
      ),
    TrelloBoardListSchema,
  );

/**
 * Lists ALL lists on a board, including closed/archived ones.
 *
 * We need every list `fetchCards` could reference. If we filtered to `open`
 * only, a card on an archived list would resolve to an empty `listName`
 * locally — appearing in a "no column" bucket and unable to be pushed
 * (because the empty string doesn't resolve to any list id).
 */
const TrelloListListSchema = Schema.Array(TrelloListSchema);

export const fetchLists = (boardId: string): TrelloEffect<ReadonlyArray<TrelloList>> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/lists`).pipe(
        HttpClientRequest.setUrlParams(authParams(creds, { fields: 'id,name,closed,pos', filter: 'all' })),
      ),
    TrelloListListSchema,
  );

/**
 * Fetches all cards on a board (including closed/archived).
 *
 * Trello's `/boards/{id}/cards/all` endpoint does NOT support a `since` parameter
 * — only `/boards/{id}/actions` does — so we full-fetch every sync. There's no
 * meaningful per-target cursor for this endpoint; the `cursor` field on
 * `IntegrationTarget` is reserved for service-defined sync state and is left
 * unset for Trello.
 */
const TrelloCardListSchema = Schema.Array(TrelloCardSchema);

export const fetchCards = (boardId: string): TrelloEffect<ReadonlyArray<TrelloCard>> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/cards/all`).pipe(
        HttpClientRequest.setUrlParams(
          authParams(creds, { fields: 'id,name,desc,closed,idList,pos,url,shortUrl,dateLastActivity' }),
        ),
      ),
    TrelloCardListSchema,
  );

/** Creates a card. */
export const createCard = (input: CreateCardInput): TrelloEffect<TrelloCard> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.post(`${TRELLO_API_BASE}/cards`).pipe(
        HttpClientRequest.setUrlParams(
          authParams(creds, input as Record<string, string | number | boolean | undefined>),
        ),
      ),
    TrelloCardSchema,
  );

/** Updates a card by id. */
export const updateCard = (cardId: string, input: UpdateCardInput): TrelloEffect<TrelloCard> =>
  trelloRequest(
    (creds) =>
      HttpClientRequest.put(`${TRELLO_API_BASE}/cards/${cardId}`).pipe(
        HttpClientRequest.setUrlParams(
          authParams(creds, input as Record<string, string | number | boolean | undefined>),
        ),
      ),
    TrelloCardSchema,
  );
