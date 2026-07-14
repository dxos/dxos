//
// Copyright 2026 DXOS.org
//

// TODO(wittjosiah): Refactor to use a dfx-style Effect-native client.

// @import-as-namespace

import * as HttpBody from '@effect/platform/HttpBody';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientError from '@effect/platform/HttpClientError';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as ParseResult from 'effect/ParseResult';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

import { SyncDatabaseMissingError } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { type AccessToken } from '@dxos/cursor';
import { Database, Obj, type Ref } from '@dxos/echo';
import { type Connection } from '@dxos/plugin-connector';

import { BSKY_PUBLIC_API, DEFAULT_FEED_LIMIT } from '../constants';
import { MissingBlueskyHandleError, PdsResolutionFailedError } from '../errors';

//
// Schemas
//

// Each schema is a strict subset of the upstream lexicon; extra fields on the
// wire are decoded as `Schema.Unknown` or simply ignored. Decoding through
// Effect Schema gives us `ParseError`s rather than runtime crashes when the
// upstream shape drifts.

const FeedAuthorSchema = Schema.Struct({
  did: Schema.String,
  handle: Schema.String,
  displayName: Schema.optional(Schema.String),
  avatar: Schema.optional(Schema.String),
});

const FeedRecordSchema = Schema.Struct({
  text: Schema.optional(Schema.String),
  createdAt: Schema.String,
});

const FeedPostSchema = Schema.Struct({
  uri: Schema.String,
  cid: Schema.String,
  author: FeedAuthorSchema,
  record: FeedRecordSchema,
  indexedAt: Schema.String,
});

const FeedReasonSchema = Schema.Struct({
  $type: Schema.optional(Schema.String),
});

const FeedViewPostSchema = Schema.Struct({
  post: FeedPostSchema,
  reason: Schema.optional(FeedReasonSchema),
});

/**
 * Subset of `app.bsky.feed.defs#feedViewPost` we read. The XRPC response
 * carries much richer data — keep the surface here narrow so call sites are
 * obvious about what they actually need.
 */
export type FeedViewPost = Schema.Schema.Type<typeof FeedViewPostSchema>;

const GetFeedResponseSchema = Schema.Struct({
  feed: Schema.Array(FeedViewPostSchema),
  cursor: Schema.optional(Schema.String),
});

/** Response shape of `app.bsky.feed.getAuthorFeed` / `getActorLikes` / `getFeed`. */
export type GetFeedResponse = Schema.Schema.Type<typeof GetFeedResponseSchema>;

// `app.bsky.bookmark.getBookmarks` returns entries whose `item` is a union of
// `postView | blockedPost | notFoundPost`. Decode loosely and post-filter.
const BookmarkItemSchema = Schema.Struct({
  $type: Schema.optional(Schema.String),
  uri: Schema.optional(Schema.String),
  cid: Schema.optional(Schema.String),
  author: Schema.optional(FeedAuthorSchema),
  record: Schema.optional(FeedRecordSchema),
  indexedAt: Schema.optional(Schema.String),
});

const BookmarkViewSchema = Schema.Struct({
  subject: Schema.Struct({ uri: Schema.String, cid: Schema.String }),
  createdAt: Schema.String,
  item: BookmarkItemSchema,
});

const GetBookmarksResponseSchema = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  bookmarks: Schema.Array(BookmarkViewSchema),
});

const SavedFeedSchema = Schema.Struct({
  /** at-uri of the feed generator. */
  value: Schema.String,
  /** `feed` for custom feeds, `list` for list-backed feeds, `timeline` for the home timeline. */
  type: Schema.Literal('feed', 'list', 'timeline'),
  pinned: Schema.optional(Schema.Boolean),
});

/** Saved/pinned feed entry from `app.bsky.actor.getPreferences`. */
export type SavedFeed = Schema.Schema.Type<typeof SavedFeedSchema>;

// `getPreferences.preferences` is heterogeneous. Multiple entry types carry
// an `items` array (`savedFeedsPrefV2`, `mutedWordsPref`, `labelersPref`, …)
// each with a different shape, so we keep the wrapper schema permissive and
// decode the saved-feed items per-entry below.
const PreferencesEntrySchema = Schema.Struct({
  $type: Schema.optional(Schema.String),
  items: Schema.optional(Schema.Array(Schema.Unknown)),
});
const GetPreferencesResponseSchema = Schema.Struct({
  preferences: Schema.Array(PreferencesEntrySchema),
});

const decodeSavedFeed = Schema.decodeUnknownOption(SavedFeedSchema);

const ResolveHandleResponseSchema = Schema.Struct({ did: Schema.String });

const DidServiceSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  // Either the bare endpoint URL (the common case) or a structured object;
  // we only consume the string form, so the object case decodes to unknown.
  serviceEndpoint: Schema.Unknown,
});
const DidDocumentSchema = Schema.Struct({
  service: Schema.optional(Schema.Array(DidServiceSchema)),
});

//
// Pure helpers (post mapping)
//

/**
 * Map a feed-view post into the lightweight shape `Subscription.makePost`
 * accepts. Bluesky-specific fields (uri, did, handle) are folded into fields
 * the existing Post schema already has.
 */
export const toSubscriptionPostInput = (item: FeedViewPost) => {
  const text = item.post.record.text ?? '';
  const handle = item.post.author.handle;
  const link = `https://bsky.app/profile/${handle}/post/${item.post.uri.split('/').pop()}`;
  return {
    title: text.slice(0, 100),
    link,
    description: text,
    author: item.post.author.displayName ?? handle,
    published: item.post.record.createdAt,
    /** `at://did:plc:.../app.bsky.feed.post/<rkey>` — stable across renames. */
    guid: item.post.uri,
  };
};

//
// Request pipeline
//

type RequestEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | HttpBody.HttpBodyError | ParseResult.ParseError | Cause.TimeoutException,
  HttpClient.HttpClient
>;

/**
 * Decide whether a request failure is worth retrying.
 *  - Transport / encode failures: yes (transient by nature).
 *  - 429 (rate limited) and 5xx: yes — exactly the cases retry was designed for.
 *  - 4xx other than 429 (auth, validation, not-found): no — retry just wastes
 *    time and may exacerbate rate limiting on the same token.
 *  - TimeoutException: yes.
 *  - Body encode failures: no — payload is a code bug, not transient.
 *  - Schema decode failures (`ParseError`): no — payload won't become valid on retry.
 */
const shouldRetry = (
  error: HttpClientError.HttpClientError | HttpBody.HttpBodyError | ParseResult.ParseError | Cause.TimeoutException,
): boolean => {
  if (error instanceof ParseResult.ParseError) {
    return false;
  }
  if (Cause.isTimeoutException(error)) {
    return true;
  }
  if (error._tag === 'HttpBodyError') {
    return false;
  }
  if (error._tag === 'RequestError') {
    return true;
  }
  // ResponseError: only retry transient response failures.
  if (error.reason !== 'StatusCode') {
    return true;
  }
  const status = error.response.status;
  return status === 429 || (status >= 500 && status <= 599);
};

/**
 * Common pipeline for outbound requests:
 *  - execute via the injected HttpClient
 *  - decode JSON body with Effect Schema (invalid shapes fail as {@link ParseResult.ParseError})
 *  - 15s timeout
 *  - exponential retry with jitter, up to 3 attempts, only on transient failures
 *  - scope the response so its body stream is released even on failure
 */
const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: Schema.Schema<T>): RequestEffect<T> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;
    return yield* httpClient.execute(request).pipe(
      Effect.flatMap((res) => Effect.flatMap(res.json, Schema.decodeUnknown(schema))),
      Effect.timeout('15 seconds'),
      Effect.retry({
        schedule: Schedule.exponential('500 millis').pipe(Schedule.jittered, Schedule.compose(Schedule.recurs(3))),
        while: shouldRetry,
      }),
      Effect.scoped,
    );
  });

/**
 * Build a `setUrlParams`-friendly record from a loosely-typed query bag,
 * dropping `undefined` and empty-string entries.
 */
const queryParams = (query: Record<string, string | number | undefined>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') {
      out[key] = String(value);
    }
  }
  return out;
};

//
// PDS resolution
//

// Atproto identities are sharded across many PDSes (including bsky.social's
// own per-user `*.host.bsky.network` shards), so authenticated XRPC must
// target whatever PDS minted the auth context. The DID document's
// `#atproto_pds` service entry is the source of truth; for did:plc we fetch
// the PLC directory directly, for did:web we fetch the
// `/.well-known/did.json` from the domain encoded in the DID.
//
// There is no safe default to fall back to (bsky.social is *not* a PDS), so
// resolution failures surface as `PdsResolutionFailedError` rather than
// getting silently routed at the wrong host.
//
// Cached per-process on success so repeated calls in one sync run don't
// re-fetch the DID doc.

const pdsCache = new Map<string, string>();

const fetchDidDocument = (did: string) => {
  if (did.startsWith('did:plc:')) {
    return runRequest(HttpClientRequest.get(`https://plc.directory/${did}`), DidDocumentSchema);
  }
  if (did.startsWith('did:web:')) {
    // Per the did:web spec, `:` separates host from path segments and each
    // segment is percent-encoded. A bare host resolves to
    // `/.well-known/did.json`; any path segments resolve to `/<path>/did.json`.
    const rest = did.slice('did:web:'.length);
    if (!rest) {
      return Effect.fail(new PdsResolutionFailedError());
    }
    const [host, ...pathSegments] = rest.split(':').map((segment) => decodeURIComponent(segment));
    const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}/did.json` : '/.well-known/did.json';
    return runRequest(HttpClientRequest.get(`https://${host}${path}`), DidDocumentSchema);
  }
  return Effect.fail(new PdsResolutionFailedError());
};

/** Resolve a handle (e.g. `user.bsky.social`) or DID to its PDS endpoint. */
const resolvePds = (handleOrDid: string) =>
  Effect.gen(function* () {
    const cached = pdsCache.get(handleOrDid);
    if (cached !== undefined) {
      return cached;
    }
    const did = handleOrDid.startsWith('did:')
      ? handleOrDid
      : yield* runRequest(
          HttpClientRequest.get(`${BSKY_PUBLIC_API}/com.atproto.identity.resolveHandle`).pipe(
            HttpClientRequest.setUrlParams({ handle: handleOrDid }),
          ),
          ResolveHandleResponseSchema,
        ).pipe(Effect.map((response) => response.did));

    const doc = yield* fetchDidDocument(did);
    const service = doc.service?.find(
      (entry) => entry.id === '#atproto_pds' || entry.type === 'AtprotoPersonalDataServer',
    );
    const endpoint = service?.serviceEndpoint;
    if (typeof endpoint !== 'string' || endpoint.length === 0) {
      return yield* Effect.fail(new PdsResolutionFailedError());
    }
    pdsCache.set(handleOrDid, endpoint);
    return endpoint;
  });

//
// Credentials service
//

type CredentialsValue = {
  spaceId: string;
  accessTokenId: string;
  accessTokenValue: string;
  edgeBaseUrl: string;
  pdsBaseUrl: string;
  /** atproto handle or DID — used as the `actor` parameter for self-feed reads. */
  handle: string;
};

/**
 * Layer-based credentials service. Mirrors the `TrelloCredentials` /
 * `GoogleCredentials` patterns: every authenticated API call pulls creds from
 * this service rather than threading them through as explicit parameters.
 *
 * Token sourcing: an operation invoked with a `Connection` composes
 * `fromConnection(ref, client)`; one invoked with an external-sync cursor
 * composes `fromAccessToken(cursor.spec.source, client)` directly (the cursor
 * no longer relates to `Connection`).
 *
 * Construction resolves the PDS once (via the public XRPC `resolveHandle`
 * and a DID-document lookup) so subsequent calls reuse it.
 */
export class Credentials extends Context.Tag('@dxos/plugin-bluesky/Credentials')<Credentials, CredentialsValue>() {
  /** Loads the connection's access token, resolves its PDS, and packages credentials. */
  static fromConnection = (connectionRef: Ref.Ref<Connection.Connection>, client: Client) =>
    Layer.effect(
      Credentials,
      Effect.gen(function* () {
        const connection = yield* Database.load(connectionRef);
        const accessToken = yield* Database.load(connection.accessToken);
        const db = Obj.getDatabase(connection);
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }
        return yield* packageCredentials(accessToken, db, client);
      }),
    );

  /** Loads the access token directly, resolves its PDS, and packages credentials. */
  static fromAccessToken = (accessTokenRef: Ref.Ref<AccessToken.AccessToken>, client: Client) =>
    Layer.effect(
      Credentials,
      Effect.gen(function* () {
        const accessToken = yield* Database.load(accessTokenRef);
        const db = Obj.getDatabase(accessToken);
        if (!db) {
          return yield* Effect.fail(new SyncDatabaseMissingError());
        }
        return yield* packageCredentials(accessToken, db, client);
      }),
    );
}

/** Shared credential-packaging step used by both {@link Credentials.fromConnection} and {@link Credentials.fromAccessToken}. */
const packageCredentials = (accessToken: AccessToken.AccessToken, db: Database.Database, client: Client) =>
  Effect.gen(function* () {
    const handle = accessToken.account;
    if (!handle) {
      return yield* Effect.fail(new MissingBlueskyHandleError());
    }
    const edgeBaseUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeBaseUrl) {
      return yield* Effect.fail(new Error('EDGE services not configured.'));
    }
    const pdsBaseUrl = yield* resolvePds(handle);
    return {
      spaceId: db.spaceId,
      accessTokenId: accessToken.id,
      accessTokenValue: accessToken.token,
      edgeBaseUrl,
      pdsBaseUrl,
      handle,
    };
  });

//
// Public API surface
//

type AuthedEffect<T> = Effect.Effect<
  T,
  HttpClientError.HttpClientError | HttpBody.HttpBodyError | ParseResult.ParseError | Cause.TimeoutException,
  HttpClient.HttpClient | Credentials
>;

type PublicEffect<T> = RequestEffect<T>;

/** Public XRPC GET — used for any read-only endpoint that doesn't need auth. */
const publicGet = <T>(
  path: string,
  query: Record<string, string | number | undefined>,
  schema: Schema.Schema<T>,
): PublicEffect<T> =>
  runRequest(
    HttpClientRequest.get(`${BSKY_PUBLIC_API}/${path}`).pipe(HttpClientRequest.setUrlParams(queryParams(query))),
    schema,
  );

/**
 * Authenticated XRPC GET — proxied through Edge `/atproto/proxy` so the
 * stored DPoP key signs the request. Edge requires the caller to include the
 * access token via `Authorization: DPoP <token>` in the proxied request's
 * headers; Edge attaches the matching DPoP proof JWT (signed with the private
 * key it stored at OAuth time) before forwarding to the user's PDS.
 */
const authedGet = <T>(input: {
  path: string;
  query: Record<string, string | number | undefined>;
  schema: Schema.Schema<T>;
}): AuthedEffect<T> =>
  Effect.gen(function* () {
    const creds = yield* Credentials;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input.query)) {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    }
    const endpoint = `${creds.pdsBaseUrl.replace(/\/$/, '')}/xrpc/${input.path}?${params.toString()}`;
    const proxyUrl = new URL('/atproto/proxy', creds.edgeBaseUrl).toString();
    const request = yield* HttpClientRequest.post(proxyUrl).pipe(
      HttpClientRequest.bodyJson({
        spaceId: creds.spaceId,
        accessTokenId: creds.accessTokenId,
        request: {
          endpoint,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `DPoP ${creds.accessTokenValue}`,
          },
          body: null,
        },
      }),
    );
    return yield* runRequest(request, input.schema);
  });

/**
 * Fetch an actor's author feed (their own posts + reposts) via the public
 * XRPC. Public reads work without auth, so this never goes through Edge.
 */
export const getAuthorFeed = (input: {
  actor: string;
  limit?: number;
  cursor?: string;
}): PublicEffect<GetFeedResponse> =>
  publicGet(
    'app.bsky.feed.getAuthorFeed',
    { actor: input.actor, limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
    GetFeedResponseSchema,
  );

/**
 * Fetch an actor's liked posts. Requires auth — proxied through Edge so the
 * stored DPoP key signs the request.
 */
export const getActorLikes = (input: {
  actor: string;
  limit?: number;
  cursor?: string;
}): AuthedEffect<GetFeedResponse> =>
  authedGet({
    path: 'app.bsky.feed.getActorLikes',
    query: { actor: input.actor, limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
    schema: GetFeedResponseSchema,
  });

/**
 * Fetch the authenticated user's bookmarked posts.
 *
 * Bookmarks are part of the standard atproto lexicon
 * (`app.bsky.bookmark.getBookmarks`); auth flows via the user's PDS the same
 * way `getActorLikes` does — the PDS proxies `app.bsky.*` requests to the
 * AppView. The response shape differs: each entry is a `bookmarkView` whose
 * `item` is a union of `postView | blockedPost | notFoundPost`. We surface
 * only the post-views and skip the rest.
 */
export const getBookmarks = (input: { limit?: number; cursor?: string }): AuthedEffect<GetFeedResponse> =>
  authedGet({
    path: 'app.bsky.bookmark.getBookmarks',
    query: { limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
    schema: GetBookmarksResponseSchema,
  }).pipe(
    Effect.map((response) => {
      const feed: FeedViewPost[] = [];
      for (const entry of response.bookmarks) {
        const item = entry.item;
        if (item.$type === 'app.bsky.feed.defs#postView' && item.uri && item.author && item.record) {
          feed.push({
            post: {
              uri: item.uri,
              cid: item.cid ?? '',
              author: item.author,
              record: item.record,
              indexedAt: item.indexedAt ?? entry.createdAt,
            },
          });
        }
      }
      return { feed, cursor: response.cursor };
    }),
  );

/** Fetch posts from a custom feed generator (`feed` is the at-uri). */
export const getFeed = (input: { feed: string; limit?: number; cursor?: string }): AuthedEffect<GetFeedResponse> =>
  authedGet({
    path: 'app.bsky.feed.getFeed',
    query: { feed: input.feed, limit: input.limit ?? DEFAULT_FEED_LIMIT, cursor: input.cursor },
    schema: GetFeedResponseSchema,
  });

/**
 * Fetch the actor's preferences and project the saved/pinned feed list. The
 * `preferences` array is heterogeneous; we pick out
 * `app.bsky.actor.defs#savedFeedsPrefV2`.
 */
export const getSavedFeeds = (): AuthedEffect<ReadonlyArray<SavedFeed>> =>
  authedGet({
    path: 'app.bsky.actor.getPreferences',
    query: {},
    schema: GetPreferencesResponseSchema,
  }).pipe(
    Effect.map((response) => {
      const savedPref = response.preferences.find((pref) => pref.$type === 'app.bsky.actor.defs#savedFeedsPrefV2');
      const items = savedPref?.items ?? [];
      return items.flatMap((item) => {
        const decoded = decodeSavedFeed(item);
        return Option.isSome(decoded) ? [decoded.value] : [];
      });
    }),
  );
