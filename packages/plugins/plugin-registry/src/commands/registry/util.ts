//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import type * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AppSpace } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { Filter } from '@dxos/echo';
import { ALL_NSIDS, NSID } from '@dxos/protocols';
import { AccessToken } from '@dxos/types';

export { ALL_NSIDS, NSID };

/**
 * Shared helpers for the `dx registry *` commands.
 *
 * These commands write `org.dxos.experimental.*` records to a publisher's PDS via AT Protocol
 * XRPC. Auth has two modes (see {@link resolveSession}):
 *
 * - **Personal-space (default):** when logged in (`dx account login`), the publisher's atproto
 *   session lives in their personal space as the "Atmosphere" `AccessToken`. Record writes are
 *   signed by Edge's DPoP proxy (`/atproto/proxy`) — no app password required.
 * - **App password (fallback):** explicit `--handle` / `--app-password` (or `$ATPROTO_HANDLE` /
 *   `$ATPROTO_APP_PASSWORD`) authenticate directly against the PDS with a session token.
 */

// `AccessToken.source` of the default atproto / login integration ("Atmosphere"). Mirrors
// `ATMOSPHERE_SOURCE` in plugin-integration; inlined to avoid a plugin-registry -> plugin-integration
// dependency.
const ATMOSPHERE_SOURCE = 'atproto.local';

// Public read-only XRPC base used for identity resolution. Works for any
// AT Protocol identity regardless of which PDS hosts it.
const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const PLC_DIRECTORY = 'https://plc.directory';

// ---------------------------------------------------------------------------
// Schemas (subset of XRPC response shapes we consume)
// ---------------------------------------------------------------------------

const CreateSessionResponseSchema = Schema.Struct({
  did: Schema.String,
  handle: Schema.String,
  accessJwt: Schema.String,
  refreshJwt: Schema.String,
});

const ResolveHandleResponseSchema = Schema.Struct({ did: Schema.String });

const DidServiceSchema = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  serviceEndpoint: Schema.Unknown,
});
const DidDocumentSchema = Schema.Struct({
  service: Schema.optional(Schema.Array(DidServiceSchema)),
});

const PutRecordResponseSchema = Schema.Struct({
  uri: Schema.String,
  cid: Schema.String,
});
export type PutRecordResponse = Schema.Schema.Type<typeof PutRecordResponseSchema>;

const ListRecordsEntrySchema = Schema.Struct({
  uri: Schema.String,
  cid: Schema.String,
  value: Schema.Unknown,
});
const ListRecordsResponseSchema = Schema.Struct({
  cursor: Schema.optional(Schema.String),
  records: Schema.Array(ListRecordsEntrySchema),
});
export type ListRecordsEntry = Schema.Schema.Type<typeof ListRecordsEntrySchema>;

// ---------------------------------------------------------------------------
// XRPC primitives
// ---------------------------------------------------------------------------

const decodeJson =
  <T>(schema: Schema.Schema<T>) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    Effect.flatMap(response.json, Schema.decodeUnknown(schema));

/** GET an XRPC endpoint and decode the JSON response. */
const xrpcGet = <T>(url: string, query: Record<string, string>, schema: Schema.Schema<T>) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    return yield* HttpClientRequest.get(url).pipe(
      HttpClientRequest.setUrlParams(query),
      client.execute,
      Effect.flatMap(decodeJson(schema)),
      Effect.scoped,
    );
  });

/** POST a JSON body to an XRPC endpoint and decode the JSON response. */
const xrpcPost = <T>(
  url: string,
  body: Record<string, unknown>,
  schema: Schema.Schema<T> | undefined,
  headers: Record<string, string> = {},
) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    const response = yield* HttpClientRequest.post(url).pipe(
      HttpClientRequest.setHeaders(headers),
      HttpClientRequest.bodyJson(body),
      Effect.flatMap((req) => client.execute(req)),
      Effect.scoped,
    );
    if (schema === undefined) {
      return undefined as T;
    }
    return yield* decodeJson(schema)(response);
  });

/** Resolve a handle (e.g. `alice.bsky.social`) to a DID via the public XRPC. */
export const resolveHandle = (handle: string) =>
  xrpcGet(`${BSKY_PUBLIC_API}/com.atproto.identity.resolveHandle`, { handle }, ResolveHandleResponseSchema).pipe(
    Effect.map((response) => response.did),
  );

/** Resolve a DID to its PDS service endpoint via the PLC directory (or did:web well-known). */
export const resolvePds = (did: string) =>
  Effect.gen(function* () {
    let doc: Schema.Schema.Type<typeof DidDocumentSchema>;
    if (did.startsWith('did:plc:')) {
      doc = yield* xrpcGet(`${PLC_DIRECTORY}/${did}`, {}, DidDocumentSchema);
    } else if (did.startsWith('did:web:')) {
      const rest = did.slice('did:web:'.length);
      const [host, ...segments] = rest.split(':').map((part) => decodeURIComponent(part));
      const path = segments.length > 0 ? `/${segments.join('/')}/did.json` : '/.well-known/did.json';
      doc = yield* xrpcGet(`https://${host}${path}`, {}, DidDocumentSchema);
    } else {
      return yield* Effect.fail(new Error(`Unsupported DID method: ${did}`));
    }
    const service = doc.service?.find(
      (entry) => entry.id === '#atproto_pds' || entry.type === 'AtprotoPersonalDataServer',
    );
    const endpoint = service?.serviceEndpoint;
    if (typeof endpoint !== 'string' || endpoint.length === 0) {
      return yield* Effect.fail(new Error(`PDS endpoint missing in DID document for ${did}`));
    }
    return endpoint;
  });

/** Resolve a handle or DID to its `{ did, pdsBaseUrl }`. */
const resolveRepo = (handleOrDid: string) =>
  Effect.gen(function* () {
    const did = handleOrDid.startsWith('did:') ? handleOrDid : yield* resolveHandle(handleOrDid);
    const pdsBaseUrl = yield* resolvePds(did);
    return { did, pdsBaseUrl };
  });

// ---------------------------------------------------------------------------
// Session — an authenticated writer to a publisher's PDS repo.
// ---------------------------------------------------------------------------

/** Direct PDS auth via an app-password session token. */
type AppPasswordSession = {
  readonly mode: 'app-password';
  readonly did: string;
  readonly handle: string;
  readonly pdsBaseUrl: string;
  readonly accessJwt: string;
};

/** Indirect auth: writes are DPoP-signed by Edge's `/atproto/proxy` using a personal-space token. */
type DpopProxySession = {
  readonly mode: 'dpop-proxy';
  readonly did: string;
  readonly handle: string;
  readonly pdsBaseUrl: string;
  readonly edgeBaseUrl: string;
  readonly spaceId: string;
  readonly accessTokenId: string;
  readonly token: string;
  readonly authHeader: string | undefined;
};

export type Session = AppPasswordSession | DpopProxySession;

/**
 * App-password session — call `com.atproto.server.createSession` against the caller's resolved
 * PDS, then return the access JWT, DID, and PDS endpoint needed for subsequent writes.
 */
export const createSession = (handle: string, appPassword: string) =>
  Effect.gen(function* () {
    // Issue the session against the resolved PDS — bsky.social's monolithic host won't accept
    // logins for users that have been migrated to a shard.
    const { did, pdsBaseUrl } = yield* resolveRepo(handle);
    const response = yield* xrpcPost(
      `${pdsBaseUrl}/xrpc/com.atproto.server.createSession`,
      { identifier: handle, password: appPassword },
      CreateSessionResponseSchema,
    );
    return {
      mode: 'app-password',
      did: response.did,
      handle: response.handle,
      accessJwt: response.accessJwt,
      pdsBaseUrl,
    } satisfies AppPasswordSession;
  });

export type ResolveSessionOptions = {
  /** `--handle` flag value (if any). */
  handle: string | undefined;
  /** `--app-password` flag value (if any). */
  appPassword: string | undefined;
  /** The DXOS client, used to read default credentials from the personal space. */
  client: Client;
};

/**
 * Resolve an authenticated {@link Session} for the registry commands, in precedence order:
 *
 * 1. Explicit `--handle` + `--app-password` (or `$ATPROTO_HANDLE` / `$ATPROTO_APP_PASSWORD`) →
 *    app-password session (works without a DXOS identity).
 * 2. The logged-in identity's personal-space "Atmosphere" `AccessToken` → DPoP-proxy session.
 * 3. A context-specific error guiding the user to log in / connect an integration / pass creds.
 */
export const resolveSession = (options: ResolveSessionOptions) =>
  Effect.gen(function* () {
    const handle = options.handle ?? Option.getOrUndefined(yield* Config.option(Config.string('ATPROTO_HANDLE')));
    const appPassword =
      options.appPassword ?? Option.getOrUndefined(yield* Config.option(Config.string('ATPROTO_APP_PASSWORD')));
    if (handle && appPassword) {
      return yield* createSession(handle, appPassword);
    }

    const fromPersonalSpace = yield* resolvePersonalSpaceSession(options.client);
    if (fromPersonalSpace) {
      return fromPersonalSpace;
    }

    if (options.client.halo.identity.get()) {
      return yield* Effect.fail(
        new Error(
          'No atproto integration connected. Connect one with `dx integration add`, or pass --handle/--app-password. ' +
            '(`dx account login` cannot add an integration to an existing identity.)',
        ),
      );
    }
    return yield* Effect.fail(
      new Error('No DXOS identity. Run `dx account login` first, or pass --handle/--app-password.'),
    );
  });

/**
 * Build a DPoP-proxy session from the personal space's "Atmosphere" `AccessToken`, or `undefined`
 * if the user isn't logged in or hasn't connected an atproto integration.
 */
const resolvePersonalSpaceSession = (client: Client) =>
  Effect.gen(function* () {
    const space = AppSpace.getPersonalSpace(client);
    if (!space) {
      return undefined;
    }
    const tokens = (yield* Effect.promise(() =>
      space.db.query(Filter.type(AccessToken.AccessToken)).run(),
    )) as AccessToken.AccessToken[];
    const token = tokens.find((object) => object.source === ATMOSPHERE_SOURCE && !!object.account && !!object.token);
    if (!token?.account) {
      return undefined;
    }
    const { did, pdsBaseUrl } = yield* resolveRepo(token.account);
    return {
      mode: 'dpop-proxy',
      did,
      handle: token.account,
      pdsBaseUrl,
      edgeBaseUrl: client.edge.http.baseUrl,
      spaceId: space.id,
      accessTokenId: token.id,
      token: token.token,
      // Best-effort VP auth header for the proxy. The `/atproto/proxy` route currently skips auth
      // in dev; production reads the caller's verifiable presentation when present.
      authHeader: (client.edge.http as unknown as { _authHeader?: string })._authHeader,
    } satisfies DpopProxySession;
  });

// ---------------------------------------------------------------------------
// Record operations — auth-mode agnostic; branch on the session.
// ---------------------------------------------------------------------------

/**
 * Proxy an XRPC call through Edge's `/atproto/proxy`, which attaches the DPoP proof signed with
 * the key Edge stored at OAuth time. The proxy forwards `request` verbatim and returns the
 * upstream PDS response body, so callers decode the same schema as the direct path.
 */
const proxyCall = <T>(
  session: DpopProxySession,
  params: {
    xrpcMethod: string;
    method: 'GET' | 'POST';
    query?: Record<string, string>;
    jsonBody?: Record<string, unknown>;
  },
  schema: Schema.Schema<T> | undefined,
) => {
  const query = params.query ? `?${new URLSearchParams(params.query).toString()}` : '';
  const innerHeaders: Record<string, string> = { Accept: 'application/json', Authorization: `DPoP ${session.token}` };
  if (params.jsonBody) {
    innerHeaders['Content-Type'] = 'application/json';
  }
  const outerHeaders: Record<string, string> = {};
  if (session.authHeader) {
    outerHeaders.Authorization = session.authHeader;
  }
  return xrpcPost(
    `${session.edgeBaseUrl.replace(/\/$/, '')}/atproto/proxy`,
    {
      spaceId: session.spaceId,
      accessTokenId: session.accessTokenId,
      request: {
        endpoint: `${session.pdsBaseUrl}/xrpc/${params.xrpcMethod}${query}`,
        method: params.method,
        headers: innerHeaders,
        // Edge's proxy forwards the body to `fetch` as-is, so it must be a pre-serialized string.
        body: params.jsonBody ? JSON.stringify(params.jsonBody) : null,
      },
    },
    schema,
    outerHeaders,
  );
};

/** Write a record at `com.atproto.repo.putRecord` (idempotent on rkey). */
export const putRecord = (session: Session, collection: string, rkey: string, record: Record<string, unknown>) => {
  const body = { repo: session.did, collection, rkey, record: { $type: collection, ...record } };
  return session.mode === 'app-password'
    ? xrpcPost(`${session.pdsBaseUrl}/xrpc/com.atproto.repo.putRecord`, body, PutRecordResponseSchema, {
        Authorization: `Bearer ${session.accessJwt}`,
      })
    : proxyCall(
        session,
        { xrpcMethod: 'com.atproto.repo.putRecord', method: 'POST', jsonBody: body },
        PutRecordResponseSchema,
      );
};

/** Delete a record at `com.atproto.repo.deleteRecord`. */
export const deleteRecord = (session: Session, collection: string, rkey: string) => {
  const body = { repo: session.did, collection, rkey };
  return session.mode === 'app-password'
    ? xrpcPost(`${session.pdsBaseUrl}/xrpc/com.atproto.repo.deleteRecord`, body, undefined, {
        Authorization: `Bearer ${session.accessJwt}`,
      })
    : proxyCall(session, { xrpcMethod: 'com.atproto.repo.deleteRecord', method: 'POST', jsonBody: body }, undefined);
};

/**
 * List records in a single collection on the authenticated repo. Paging is left to the caller (the
 * four registry collections are tiny in practice); the cursor is surfaced on the return.
 */
export const listRecords = (
  session: Session,
  collection: string,
  options: { limit?: number; cursor?: string } = {},
) => {
  const query: Record<string, string> = {
    repo: session.did,
    collection,
    ...(options.limit !== undefined ? { limit: String(options.limit) } : {}),
    ...(options.cursor !== undefined ? { cursor: options.cursor } : {}),
  };
  return session.mode === 'app-password'
    ? xrpcGet(`${session.pdsBaseUrl}/xrpc/com.atproto.repo.listRecords`, query, ListRecordsResponseSchema)
    : proxyCall(
        session,
        { xrpcMethod: 'com.atproto.repo.listRecords', method: 'GET', query },
        ListRecordsResponseSchema,
      );
};

// ---------------------------------------------------------------------------
// Shared CLI option fragment for auth flags.
// ---------------------------------------------------------------------------

export const AUTH_OPTION_DESCRIPTIONS = {
  handle:
    'AT Protocol handle (e.g. alice.bsky.social). Defaults to the logged-in identity; falls back to $ATPROTO_HANDLE.',
  appPassword:
    'AT Protocol app password (https://bsky.app/settings/app-passwords). Falls back to $ATPROTO_APP_PASSWORD. ' +
    'Not needed when logged in via `dx account login`.',
} as const;
