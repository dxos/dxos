//
// Copyright 2026 DXOS.org
//

import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import type * as HttpClientResponse from '@effect/platform/HttpClientResponse';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

/**
 * Shared helpers for the `dx registry *` commands.
 *
 * These commands write `org.dxos.experimental.*` records to a publisher's PDS
 * via AT Protocol XRPC. Auth uses an App Password (per-user secret minted at
 * https://bsky.app/settings/app-passwords) — OAuth + DPoP will replace this in
 * a follow-up. Creds come from `--handle` / `--app-password` flags falling
 * back to `ATPROTO_HANDLE` / `ATPROTO_APP_PASSWORD` env vars.
 */

// NSIDs the registry indexer cares about. Mirrored from
// packages/services/registry-service/src/registry/atproto/schema.ts in the edge repo.
export const NSID = {
  PackageProfile: 'org.dxos.experimental.package.profile',
  PackageRelease: 'org.dxos.experimental.package.release',
  PublisherProfile: 'org.dxos.experimental.publisher.profile',
  PublisherVerification: 'org.dxos.experimental.publisher.verification',
} as const;

export const ALL_NSIDS: readonly string[] = Object.values(NSID);

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
// Credentials
// ---------------------------------------------------------------------------

export type RegistryAuthOptions = {
  handle: string | undefined;
  appPassword: string | undefined;
};

/**
 * Resolve `(handle, appPassword)` from CLI flags or env. Missing values
 * surface as a typed ConfigError on the effect channel.
 */
export const resolveCredentials = (options: RegistryAuthOptions) =>
  Effect.gen(function* () {
    const handle = options.handle ?? (yield* Config.string('ATPROTO_HANDLE'));
    const appPassword = options.appPassword ?? (yield* Config.string('ATPROTO_APP_PASSWORD'));
    return { handle, appPassword };
  });

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

/**
 * Authenticated session — call `com.atproto.server.createSession` against the
 * caller's resolved PDS, then return the access JWT, DID, and PDS endpoint
 * needed for subsequent writes.
 */
export type Session = {
  did: string;
  handle: string;
  accessJwt: string;
  pdsBaseUrl: string;
};

export const createSession = (handle: string, appPassword: string) =>
  Effect.gen(function* () {
    const did = yield* resolveHandle(handle);
    // Issue the session against the resolved PDS — bsky.social's monolithic
    // host won't accept logins for users that have been migrated to a shard.
    const pdsBaseUrl = yield* resolvePds(did);
    const response = yield* xrpcPost(
      `${pdsBaseUrl}/xrpc/com.atproto.server.createSession`,
      { identifier: handle, password: appPassword },
      CreateSessionResponseSchema,
    );
    return {
      did: response.did,
      handle: response.handle,
      accessJwt: response.accessJwt,
      pdsBaseUrl,
    } satisfies Session;
  });

/** Write a record at `com.atproto.repo.putRecord` (idempotent on rkey). */
export const putRecord = (
  session: Session,
  collection: string,
  rkey: string,
  record: Record<string, unknown>,
) =>
  xrpcPost(
    `${session.pdsBaseUrl}/xrpc/com.atproto.repo.putRecord`,
    {
      repo: session.did,
      collection,
      rkey,
      record: { $type: collection, ...record },
    },
    PutRecordResponseSchema,
    { Authorization: `Bearer ${session.accessJwt}` },
  );

/** Delete a record at `com.atproto.repo.deleteRecord`. */
export const deleteRecord = (session: Session, collection: string, rkey: string) =>
  xrpcPost(
    `${session.pdsBaseUrl}/xrpc/com.atproto.repo.deleteRecord`,
    { repo: session.did, collection, rkey },
    undefined,
    { Authorization: `Bearer ${session.accessJwt}` },
  );

/**
 * List records in a single collection on the authenticated repo. Paging is
 * left to the caller (the four registry collections are tiny in practice);
 * the cursor is surfaced on the return.
 */
export const listRecords = (
  session: Session,
  collection: string,
  options: { limit?: number; cursor?: string } = {},
) =>
  xrpcGet(
    `${session.pdsBaseUrl}/xrpc/com.atproto.repo.listRecords`,
    {
      repo: session.did,
      collection,
      ...(options.limit !== undefined ? { limit: String(options.limit) } : {}),
      ...(options.cursor !== undefined ? { cursor: options.cursor } : {}),
    },
    ListRecordsResponseSchema,
  );

// ---------------------------------------------------------------------------
// Shared CLI option fragment for auth flags.
// ---------------------------------------------------------------------------

export const AUTH_OPTION_DESCRIPTIONS = {
  handle: 'AT Protocol handle (e.g. alice.bsky.social). Falls back to $ATPROTO_HANDLE.',
  appPassword: 'AT Protocol app password (https://bsky.app/settings/app-passwords). Falls back to $ATPROTO_APP_PASSWORD.',
} as const;
