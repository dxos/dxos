//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import type * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';

import { TRELLO_API_BASE } from '../constants';

/** Trello API credentials. The `key` is the user's API key; `token` is the user-issued API token. */
export type TrelloCredentials = {
  key: string;
  token: string;
};

/** Subset of the authenticated member returned by `GET /members/me`. */
export type TrelloMember = {
  id: string;
  username: string;
  fullName: string;
  email?: string;
};

/** Subset of a Trello board returned by `GET /members/me/boards`. */
export type TrelloBoard = {
  id: string;
  name: string;
  closed: boolean;
  url: string;
  shortUrl: string;
  dateLastActivity: string;
};

/** Subset of a Trello list returned by `GET /boards/{id}/lists`. */
export type TrelloList = {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
};

/** Subset of a Trello card returned by `GET /boards/{id}/cards`. */
export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  closed: boolean;
  idList: string;
  pos: number;
  url: string;
  shortUrl: string;
  dateLastActivity: string;
};

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
 */
export const credentialsFromAccessToken = (record: { token: string }): TrelloCredentials => {
  const parts = record.token.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(
      'Trello access token must be a "<apiKey>:<userToken>" colon-separated string.',
    );
  }
  const [key, token] = parts;
  return { key, token };
};

/**
 * Build a Trello request URL params record that includes the auth pair plus
 * any additional query params the caller wants to set.
 */
const authParams = (creds: TrelloCredentials, extra: Record<string, string | number | boolean | undefined> = {}) => {
  const out: Record<string, string> = { key: creds.key, token: creds.token };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
};

type TrelloEffect<T> = Effect.Effect<T, HttpClientError.HttpClientError, HttpClient.HttpClient>;

/**
 * Decide whether a Trello request failure is worth retrying.
 *  - Transport / encode / invalid-URL failures: yes (transient by nature).
 *  - 429 (rate limited) and 5xx: yes — exactly the cases retry was designed for.
 *  - 4xx other than 429 (auth, validation, not-found): no — retry just wastes time
 *    and, for 401/403, may exacerbate rate limiting on the same token.
 *  - TimeoutException (the request didn't complete in the allotted window): yes.
 */
const shouldRetry = (error: HttpClientError.HttpClientError | Cause.TimeoutException): boolean => {
  if (error._tag === 'TimeoutException') return true;
  if (error._tag === 'RequestError') return true;
  // ResponseError: only retry transient response failures.
  if (error.reason !== 'StatusCode') return true;
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

/**
 * Common pipeline for Trello requests:
 *  - execute via the injected HttpClient with its tracer disabled (Effect's
 *    tracer adds a `traceparent` header which trips CORS preflight on
 *    api.trello.com — Trello answers the GET fine but doesn't handle the
 *    preflight OPTIONS, so the browser blocks the response. Same workaround
 *    we use for Google's userinfo endpoint).
 *  - parse JSON body
 *  - 15s timeout
 *  - exponential retry with jitter, up to 3 attempts, only on transient failures
 *    (transport errors, 429, 5xx) — never on 4xx auth/validation errors.
 *  - scope the response so its body stream is released even on failure
 */
const runRequest = <T>(request: HttpClientRequest.HttpClientRequest): TrelloEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    const clientNoTracer = httpClient.pipe(HttpClient.withTracerDisabledWhen(() => true));
    return yield* clientNoTracer.execute(request).pipe(
      Effect.flatMap((res) => res.json as Effect.Effect<T, HttpClientError.HttpClientError>),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  }) as TrelloEffect<T>;

/** Returns the authenticated member's identity. */
export const fetchMember = (creds: TrelloCredentials): TrelloEffect<TrelloMember> =>
  runRequest(
    HttpClientRequest.get(`${TRELLO_API_BASE}/members/me`).pipe(
      HttpClientRequest.setUrlParams(authParams(creds, { fields: 'id,username,fullName,email' })),
    ),
  );

/** Lists all boards the authenticated user can access. */
export const fetchBoards = (creds: TrelloCredentials): TrelloEffect<TrelloBoard[]> =>
  runRequest(
    HttpClientRequest.get(`${TRELLO_API_BASE}/members/me/boards`).pipe(
      HttpClientRequest.setUrlParams(
        authParams(creds, { fields: 'id,name,closed,url,shortUrl,dateLastActivity', filter: 'open' }),
      ),
    ),
  );

/**
 * Lists ALL lists on a board, including closed/archived ones.
 *
 * We need every list `fetchCards` could reference. If we filtered to `open`
 * only, a card on an archived list would resolve to an empty `listName`
 * locally — appearing in a "no column" bucket and unable to be pushed
 * (because the empty string doesn't resolve to any list id).
 */
export const fetchLists = (boardId: string, creds: TrelloCredentials): TrelloEffect<TrelloList[]> =>
  runRequest(
    HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/lists`).pipe(
      HttpClientRequest.setUrlParams(authParams(creds, { fields: 'id,name,closed,pos', filter: 'all' })),
    ),
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
export const fetchCards = (boardId: string, creds: TrelloCredentials): TrelloEffect<TrelloCard[]> =>
  runRequest(
    HttpClientRequest.get(`${TRELLO_API_BASE}/boards/${boardId}/cards/all`).pipe(
      HttpClientRequest.setUrlParams(
        authParams(creds, { fields: 'id,name,desc,closed,idList,pos,url,shortUrl,dateLastActivity' }),
      ),
    ),
  );

/** Creates a card. */
export const createCard = (creds: TrelloCredentials, input: CreateCardInput): TrelloEffect<TrelloCard> =>
  runRequest(
    HttpClientRequest.post(`${TRELLO_API_BASE}/cards`).pipe(
      HttpClientRequest.setUrlParams(authParams(creds, input as Record<string, string | number | boolean | undefined>)),
    ),
  );

/** Updates a card by id. */
export const updateCard = (
  creds: TrelloCredentials,
  cardId: string,
  input: UpdateCardInput,
): TrelloEffect<TrelloCard> =>
  runRequest(
    HttpClientRequest.put(`${TRELLO_API_BASE}/cards/${cardId}`).pipe(
      HttpClientRequest.setUrlParams(authParams(creds, input as Record<string, string | number | boolean | undefined>)),
    ),
  );
