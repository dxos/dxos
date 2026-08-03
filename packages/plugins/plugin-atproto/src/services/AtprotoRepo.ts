//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as HttpClientRequest from '@effect/platform/HttpClientRequest';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { Database, Obj, type Ref } from '@dxos/echo';
import { Connection } from '@dxos/plugin-connector';

import { AtprotoRepoError, EdgeNotConfiguredError, MissingHandleError, PdsResolutionError } from '../errors';
import { canonicalStringify } from '../hash';

export type PutRecordParams = {
  collection: string;
  rkey: string;
  record: Record<string, unknown>;
};

export type PutRecordResult = {
  uri: string;
  cid: string;
};

export type DeleteRecordParams = {
  collection: string;
  rkey: string;
};

/** A single record in a repo collection. */
export type RepoRecord = {
  uri: string;
  cid: string;
  rkey: string;
  value: Record<string, unknown>;
};

export type ListRecordsParams = {
  collection: string;
  limit?: number;
  cursor?: string;
};

export type ListRecordsResult = {
  records: RepoRecord[];
  cursor?: string;
};

/**
 * The atproto repo wire surface, bound to a single connection's account (repo). Backed by a live
 * Edge-proxied XRPC implementation or an in-memory mock (tests, storybook).
 */
export interface Repo {
  readonly did: string;
  readonly putRecord: (params: PutRecordParams) => Effect.Effect<PutRecordResult, AtprotoRepoError>;
  readonly deleteRecord: (params: DeleteRecordParams) => Effect.Effect<void, AtprotoRepoError>;
  /** List the lexicon NSIDs of the collections present in the repo. */
  readonly describeRepo: () => Effect.Effect<string[], AtprotoRepoError>;
  /** List records in a collection (public read). */
  readonly listRecords: (params: ListRecordsParams) => Effect.Effect<ListRecordsResult, AtprotoRepoError>;
}

export class Service extends Context.Tag('@dxos/plugin-atproto/AtprotoRepo')<Service, Repo>() {}

//
// Mock implementation.
//

export type MockRepo = Repo & {
  /** Records currently in the mock repo, keyed by `<collection>/<rkey>`. */
  readonly records: ReadonlyMap<string, Record<string, unknown>>;
};

const cidFor = (record: Record<string, unknown>): string => {
  const input = canonicalStringify(record);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `bafyrei${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

/** In-memory repo with deterministic uris/cids — no network, safe for tests and storybook. */
export const makeMock = (did = 'did:mock:alice'): MockRepo => {
  const records = new Map<string, Record<string, unknown>>();
  const toRecord = (key: string, value: Record<string, unknown>): RepoRecord => {
    const rkey = key.slice(key.lastIndexOf('/') + 1);
    const collection = key.slice(0, key.lastIndexOf('/'));
    return { uri: `at://${did}/${collection}/${rkey}`, cid: cidFor(value), rkey, value };
  };
  return {
    did,
    records,
    putRecord: ({ collection, rkey, record }) =>
      Effect.sync(() => {
        records.set(`${collection}/${rkey}`, record);
        return { uri: `at://${did}/${collection}/${rkey}`, cid: cidFor(record) };
      }),
    deleteRecord: ({ collection, rkey }) =>
      Effect.sync(() => {
        records.delete(`${collection}/${rkey}`);
      }),
    describeRepo: () =>
      Effect.sync(() => [...new Set([...records.keys()].map((key) => key.slice(0, key.lastIndexOf('/'))))]),
    listRecords: ({ collection }) =>
      Effect.sync(() => ({
        records: [...records.entries()]
          .filter(([key]) => key.slice(0, key.lastIndexOf('/')) === collection)
          .map(([key, value]) => toRecord(key, value)),
      })),
  };
};

/** A mock repo layer. Pass a shared {@link MockRepo} to inspect writes from a test. */
export const layerMock = (mock: MockRepo = makeMock()): Layer.Layer<Service> => Layer.succeed(Service, mock);

//
// Live implementation (Edge-proxied XRPC).
//

type Credentials = {
  spaceId: string;
  accessTokenId: string;
  accessTokenValue: string;
  edgeBaseUrl: string;
  pdsBaseUrl: string;
  handle: string;
};

const ResolveHandleResponse = Schema.Struct({ did: Schema.String });
const DidService = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  serviceEndpoint: Schema.optional(Schema.String),
});
const DidDocument = Schema.Struct({ service: Schema.optional(Schema.Array(DidService)) });
const WriteResponse = Schema.Struct({ uri: Schema.String, cid: Schema.String });
const DescribeRepoResponse = Schema.Struct({ collections: Schema.Array(Schema.String) });
const ListRecordsResponse = Schema.Struct({
  records: Schema.Array(
    Schema.Struct({
      uri: Schema.String,
      cid: Schema.String,
      value: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    }),
  ),
  cursor: Schema.optional(Schema.String),
});

const rkeyFromUri = (uri: string): string => uri.slice(uri.lastIndexOf('/') + 1);

const getJson = <A>(client: HttpClient.HttpClient, url: string, schema: Schema.Schema<A>) =>
  client.execute(HttpClientRequest.get(url)).pipe(
    Effect.flatMap((response) => Effect.flatMap(response.json, Schema.decodeUnknown(schema))),
    Effect.scoped,
  );

/** Resolve the PDS service endpoint from a handle or DID via public resolveHandle + DID document. */
const resolvePds = (handleOrDid: string, client: HttpClient.HttpClient): Effect.Effect<string, PdsResolutionError> =>
  Effect.gen(function* () {
    let did = handleOrDid;
    if (!did.startsWith('did:')) {
      const resolved = yield* getJson(
        client,
        `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handleOrDid)}`,
        ResolveHandleResponse,
      );
      did = resolved.did;
    }
    const docUrl = did.startsWith('did:web:')
      ? `https://${did.slice('did:web:'.length)}/.well-known/did.json`
      : `https://plc.directory/${did}`;
    const doc = yield* getJson(client, docUrl, DidDocument);
    const endpoint = doc.service?.find(
      (service) => service.id === '#atproto_pds' || service.type === 'AtprotoPersonalDataServer',
    )?.serviceEndpoint;
    if (!endpoint) {
      return yield* Effect.fail(new PdsResolutionError({ message: `No PDS endpoint for ${did}` }));
    }
    return endpoint;
  }).pipe(
    Effect.mapError((cause) =>
      cause instanceof PdsResolutionError ? cause : new PdsResolutionError({ message: 'PDS resolution failed', cause }),
    ),
  );

const resolveCredentials = (
  connectionRef: Ref.Ref<Connection.Connection>,
  client: Client,
  httpClient: HttpClient.HttpClient,
) =>
  Effect.gen(function* () {
    const connection = yield* Database.load(connectionRef);
    const accessToken = yield* Database.load(connection.accessToken);
    const handle = accessToken.account;
    if (!handle) {
      return yield* Effect.fail(new MissingHandleError({ message: 'Connection access token has no account handle.' }));
    }
    const edgeBaseUrl = client.config.values.runtime?.services?.edge?.url;
    if (!edgeBaseUrl) {
      return yield* Effect.fail(new EdgeNotConfiguredError({ message: 'EDGE services are not configured.' }));
    }
    const spaceId = Obj.getDatabase(connection)?.spaceId;
    if (!spaceId) {
      return yield* Effect.fail(new MissingHandleError({ message: 'Connection is not attached to a space.' }));
    }
    const pdsBaseUrl = yield* resolvePds(handle, httpClient);
    return {
      spaceId,
      accessTokenId: accessToken.id,
      accessTokenValue: accessToken.token,
      edgeBaseUrl,
      pdsBaseUrl,
      handle,
    } satisfies Credentials;
  });

/**
 * The Edge `/atproto/proxy` write envelope: Edge attaches the DPoP proof for the stored key before
 * forwarding `request` to the user's PDS.
 */
const proxyWrite = <A>(
  client: HttpClient.HttpClient,
  creds: Credentials,
  nsid: string,
  body: Record<string, unknown>,
  schema: Schema.Schema<A>,
): Effect.Effect<A, AtprotoRepoError> => {
  const endpoint = `${creds.pdsBaseUrl.replace(/\/$/, '')}/xrpc/${nsid}`;
  const proxyUrl = new URL('/atproto/proxy', creds.edgeBaseUrl).toString();
  return HttpClientRequest.post(proxyUrl).pipe(
    HttpClientRequest.bodyJson({
      spaceId: creds.spaceId,
      accessTokenId: creds.accessTokenId,
      request: {
        endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `DPoP ${creds.accessTokenValue}`,
        },
        // The Edge proxy forwards this verbatim as the fetch body, so it must be a pre-serialized JSON
        // string (an object would reach the PDS as "[object Object]").
        body: JSON.stringify(body),
      },
    }),
    Effect.flatMap(client.execute),
    Effect.flatMap((response) =>
      Effect.gen(function* () {
        if (response.status < 200 || response.status >= 300) {
          // Surface the PDS/Edge error body (e.g. lexicon validation detail) instead of a bare "failed".
          const text = yield* response.text.pipe(Effect.orElseSucceed(() => ''));
          return yield* Effect.fail(
            new AtprotoRepoError({ message: `${nsid} failed (${response.status})${text ? `: ${text}` : ''}` }),
          );
        }
        return yield* Schema.decodeUnknown(schema)(yield* response.json);
      }),
    ),
    Effect.scoped,
    Effect.mapError((cause) =>
      cause instanceof AtprotoRepoError ? cause : new AtprotoRepoError({ message: `${nsid} failed`, cause }),
    ),
  );
};

// Public XRPC GET reads against the PDS — no auth/Edge proxy needed; shared by live and public repos.
const makeReader = (
  client: HttpClient.HttpClient,
  pdsBaseUrl: string,
  repo: string,
): Pick<Repo, 'describeRepo' | 'listRecords'> => {
  const base = pdsBaseUrl.replace(/\/$/, '');
  return {
    describeRepo: () =>
      getJson(
        client,
        `${base}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(repo)}`,
        DescribeRepoResponse,
      ).pipe(
        Effect.map((response) => [...response.collections]),
        Effect.mapError((cause) => new AtprotoRepoError({ message: 'describeRepo failed', cause })),
      ),
    listRecords: ({ collection, limit = 50, cursor }) => {
      const params = new URLSearchParams({ repo, collection, limit: String(limit) });
      if (cursor) {
        params.set('cursor', cursor);
      }
      return getJson(
        client,
        `${base}/xrpc/com.atproto.repo.listRecords?${params.toString()}`,
        ListRecordsResponse,
      ).pipe(
        Effect.map((response) => ({
          records: response.records.map((record) => ({
            uri: record.uri,
            cid: record.cid,
            rkey: rkeyFromUri(record.uri),
            value: { ...record.value },
          })),
          cursor: response.cursor,
        })),
        Effect.mapError((cause) => new AtprotoRepoError({ message: 'listRecords failed', cause })),
      );
    },
  };
};

const makeLive = (client: HttpClient.HttpClient, creds: Credentials): Repo => ({
  did: creds.handle,
  ...makeReader(client, creds.pdsBaseUrl, creds.handle),
  putRecord: ({ collection, rkey, record }) =>
    // atproto validates the record against the collection lexicon and requires its `$type` to match.
    proxyWrite(
      client,
      creds,
      'com.atproto.repo.putRecord',
      { repo: creds.handle, collection, rkey, record: { $type: collection, ...record } },
      WriteResponse,
    ),
  deleteRecord: ({ collection, rkey }) =>
    proxyWrite(
      client,
      creds,
      'com.atproto.repo.deleteRecord',
      { repo: creds.handle, collection, rkey },
      Schema.Struct({}),
    ).pipe(Effect.asVoid),
});

// Public (unauthenticated) repo: reads work; writes fail — there are no credentials.
const readOnly = () =>
  Effect.fail(new AtprotoRepoError({ message: 'Repo is read-only (public access; no credentials).' }));

const makePublic = (client: HttpClient.HttpClient, pdsBaseUrl: string, handle: string): Repo => ({
  did: handle,
  ...makeReader(client, pdsBaseUrl, handle),
  putRecord: readOnly,
  deleteRecord: readOnly,
});

/**
 * Live repo layer for a given connection. Resolves credentials + PDS once; provides its own HTTP
 * client, so its only remaining requirement is the errors it can fail with.
 */
export const layerLive = (options: { connection: Ref.Ref<Connection.Connection>; client: Client }) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const creds = yield* resolveCredentials(options.connection, options.client, httpClient);
      return makeLive(httpClient, creds);
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));

/**
 * Public read-only repo layer for an arbitrary handle/DID. Resolves the PDS from the handle and reads
 * via public XRPC (no auth) — used by the PDS browser to view any account's repo.
 */
export const layerPublic = (handle: string) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const httpClient = yield* HttpClient.HttpClient;
      const pdsBaseUrl = yield* resolvePds(handle, httpClient);
      return makePublic(httpClient, pdsBaseUrl, handle);
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
