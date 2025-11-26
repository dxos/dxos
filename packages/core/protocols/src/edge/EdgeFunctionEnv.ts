//
// Copyright 2025 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { type QueryResult, type QueueQuery } from '../queue';

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
X-Trace-Queue-Dxn: dxn:queue:trace:AAAAAA:BBBBBB
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
}

/**
 * Use to trace the execution across multiple services.
 *
 * NOTE: Currently unused in functions.
 */
interface ExecutionContext {}

/**
 * Database API for other CF services like functions.
 */
export interface DataService {
  getSpaceMeta(ctx: ExecutionContext, spaceId: SpaceId): Promise<SpaceMeta | undefined>;
  getDocument(ctx: ExecutionContext, spaceId: SpaceId, documentId: string): Promise<RawDocument | undefined>;

  query(ctx: ExecutionContext, request: QueryRequest): Promise<QueryResponse>;
  queryDocuments(ctx: ExecutionContext, request: QueryRequest): Promise<QueryDocumentsResponse>;
  queryReferences(ctx: ExecutionContext, request: QueryReferencesRequest): Promise<QueryReferencesResponse>;

  // TODO(burdon): Update? Return DocumentEntry?
  changeDocument(ctx: ExecutionContext, spaceId: SpaceId, documentId: string, changes: Uint8Array): Promise<void>;
}

export interface QueueService {
  query(ctx: ExecutionContext, queueDXN: string, query: Omit<QueueQuery, 'queueId'>): Promise<QueryResult>;
  append(ctx: ExecutionContext, queueDXN: string, objects: unknown[]): Promise<void>;
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

export type QueryRequest = {
  spaceId: string;
  type?: string;
  where?: Record<string, any>;
  objectIds?: string[];
  cursor?: string;
  limit?: number;
};

export type QueryResponse = {
  results: ObjectSnapshot[];
  cursor?: string;
};

/**
 * TODO(yaroslav): make Indexer return EchoObject after create() can properly reconstruct an object
 *   from this structure (meta, id and type aren't handled properly)
 */
export type ObjectSnapshot = {
  type?: string;
  documentId: string;
  objectId: string;
  // TODO(mykola): Use ObjectStructure from @dxos/echo-protocol.
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

export type CreateDocumentResponse = {
  /** Automerge document ID. */
  documentId: string;
};
