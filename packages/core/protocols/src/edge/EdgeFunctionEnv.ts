//
// Copyright 2025 DXOS.org
//

import { type SpaceId, type URI } from '@dxos/keys';

import { type CreateDocumentResponse } from '../DataService.ts';
import type * as FeedProtocol from '../FeedProtocol';
import type { SerializedError } from '../index';
import { type QueryRequest, type QueryResponse } from '../proto/gen/dxos/echo/query';

/*

API for the edge functions service.
A function module should be a valid cloudflare worker module.

# Fetching metadata (done on deploy)

GET http://functions.dxos.internal/
X-DXOS-Function-Route: meta

Expected to return `FunctionMetadata` in JSON:

{
  key: string;
  name?: string;
  description?: string;
  inputSchema?: JsonSchemaType;
  outputSchema?: JsonSchemaType;
}

# Invoking the function

POST http://functions.dxos.internal/
Content-Type: application/json
X-Trace-Queue-Dxn: echo://AAAAAA/BBBBBB
X-Invocation-Id: XXXXXXX
X-Edge-Env: production

{input_data}

Expected to return `EdgeEnvelope` with the output data:

{
  success: true,
  data: unknown
}

On Error returns `EdgeEnvelope` with error:

{
  success: false,
  message: string
  error: EncodedError
}

*/

/**
 * Environment available to the function running on Cloudflare.
 */
export interface Env {
  QUEUE_SERVICE: QueueService;
  DATA_SERVICE: DataService;
  FUNCTIONS_AI_SERVICE: FunctionsAiService;
  /** Absent when the function is not invoked in the context of a space. */
  ACCESS_TOKEN_SERVICE?: AccessTokenService;
}

/**
 * Use to trace the execution across multiple services.
 *
 * NOTE: Currently unused in functions.
 */
export interface TraceContext {}

/**
 * Database API for other CF services like functions.
 */
export interface DataService {
  getSpaceMeta(ctx: TraceContext, spaceId: SpaceId): Promise<RpcResult<SpaceMeta | undefined>>;
  getDocument(ctx: TraceContext, spaceId: SpaceId, documentId: string): Promise<RpcResult<RawDocument | undefined>>;

  execQuery(ctx: TraceContext, request: QueryRequest): Promise<RpcResult<QueryResponse>>;
  createDocument(
    ctx: TraceContext,
    spaceId: SpaceId,
    initialValue?: Record<string, any>,
  ): Promise<RpcResult<CreateDocumentResponse>>;

  // TODO(burdon): Update? Return DocumentEntry?
  changeDocument(ctx: TraceContext, spaceId: SpaceId, documentId: string, changes: Uint8Array): Promise<void>;
}

export interface QueueService {
  queryQueue: (
    ctx: TraceContext,
    request: FeedProtocol.QueryFeedRequest,
  ) => Promise<RpcResult<FeedProtocol.QueryResult>>;
  insertIntoQueue: (
    ctx: TraceContext,
    request: FeedProtocol.InsertIntoFeedRequest,
  ) => Promise<RpcResult<RpcDisposable>>;
  deleteFromQueue: (
    ctx: TraceContext,
    request: FeedProtocol.DeleteFromFeedRequest,
  ) => Promise<RpcResult<RpcDisposable>>;
}

/**
 * Resolves server-custodied access tokens (those stored as `MANAGED_ACCESS_TOKEN`) for functions.
 *
 * The binding is created bound to the invocation's space, so a function can only reach credentials
 * for the space it runs in — the space is not a parameter the caller can choose.
 */
export interface AccessTokenService {
  getAccessToken(ctx: TraceContext, request: GetAccessTokenRequest): Promise<RpcResult<GetAccessTokenResult>>;
}

export type GetAccessTokenRequest = {
  /** Id of the `AccessToken` object the grant was registered against. */
  accessTokenId: string;
};

export type GetAccessTokenResult =
  | { success: true; accessToken: string; expiresAtMillis: number }
  | { success: false; reason: string };

/**
 * FunctionsAiService API for other CF services like functions.
 */
export interface FunctionsAiService {
  /**
   * Enables proxying HTTP requests to the AI service from other workers.
   */
  fetch(request: Request): Promise<RpcResult<Response>>;
}

export type FunctionInvokeOptions = {
  spaceId?: SpaceId;
  /**
   * URI of the conversation feed (queue).
   * Forwarded into the function context so nested operations can resolve
   * the conversation-scoped `HarnessService` and related services.
   */
  conversation?: URI.URI;
  cpuTimeLimit?: number;
  subrequestsLimit?: number;
};

export type FunctionInvokeResult =
  | {
      _kind: 'success';
      data: unknown;
    }
  | {
      _kind: 'error';
      error: SerializedError;
    };

export interface FunctionsQuery {
  spaceId?: SpaceId;
}

export interface FunctionsService {
  query(query: FunctionsQuery): Promise<RpcResult<unknown[]>>; // TODO(dmaretskyi): The type is Operation.PersistentOperation[].

  invoke(
    deploymentId: string,
    input: unknown,
    options?: FunctionInvokeOptions,
  ): Promise<RpcResult<FunctionInvokeResult>>;
}

export type ObjectDocumentJson = {
  type?: string;
  objectId: string;
  documentId: string;
  /** Base64 encoding of a document. */
  document: string;
};

export type SpaceMeta = {
  spaceKey: string;
  rootDocumentId: string;
};

/**
 * TODO(yaroslav): make Indexer return EchoObject after create() can properly reconstruct an object
 *   from this structure (meta, id and type aren't handled properly)
 */
export type ObjectSnapshot = {
  type?: string;
  documentId: string;
  objectId: string;
  // TODO(mykola): Use EntityStructure from @dxos/echo-protocol.
  object: unknown;
};

export type ObjectReference = {
  fromId: string;
  toId: string;
  fieldName: string;
};

export type QueryDocumentsResponse = {
  results: RawObject[];
  cursor?: string;
};

export type RawDocument = {
  documentId: string;
  data: Uint8Array;
};

export type RawObject = {
  type?: string;
  objectId: string;
  document: RawDocument;
};

export type QueryReferencesRequest = {
  spaceId: string;
  objectId: string;
  referenceType: 'from' | 'to';
};

export type QueryReferencesResponse = {
  references: ObjectReference[];
};

/**
 * Cloudflare Workers RPC returns objects/arrays/stubs that may need to be explicitly disposed.
 *
 * See: https://developers.cloudflare.com/workers/runtime-apis/rpc/lifecycle/
 */
export interface RpcDisposable {
  /**
   * Disposes the RPC stub / returned value and releases any server-side resources it references.
   */
  [Symbol.dispose](): void;
}

/**
 * Wraps a return type so that any non-primitive value is marked as disposable.
 *
 * This models Workers RPC behavior where any returned object (including arrays) gets a disposer added.
 */
export type RpcResult<T> = T extends object ? T & RpcDisposable : T;
