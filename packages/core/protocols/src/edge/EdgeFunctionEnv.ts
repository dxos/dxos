//
// Copyright 2025 DXOS.org
//

//
// Copyright 2024 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { type QueryResult, type QueueQuery } from '../queue';

/*

API for the edge functions service.
A function module should be a valid cloudflare worker module.

TODO(dmaretskyi): Describe HTTP api.
*/

/**
 * Database API for other CF services like functions.
 */
export interface DataService {
  getSpaceMeta(ctx: unknown, spaceId: SpaceId): Promise<SpaceMeta | undefined>;
  getDocument(ctx: unknown, spaceId: SpaceId, documentId: string): Promise<RawDocument | undefined>;

  query(ctx: unknown, request: QueryRequest): Promise<QueryResponse>;
  queryDocuments(ctx: unknown, request: QueryRequest): Promise<QueryDocumentsResponse>;
  queryReferences(ctx: unknown, request: QueryReferencesRequest): Promise<QueryReferencesResponse>;

  // TODO(burdon): Update? Return DocumentEntry?
  changeDocument(ctx: unknown, spaceId: SpaceId, documentId: string, changes: Uint8Array): Promise<void>;
}

export interface QueueService {
  query(ctx: unknown, queueDXN: string, query: Omit<QueueQuery, 'queueId'>): Promise<QueryResult>;
  append(ctx: unknown, queueDXN: string, objects: unknown[]): Promise<void>;
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
  // TODO(mykola): Use ObjectStructure.
  object: any;
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

/**
 * Environment variable available to Cloudflare functions.
 */
export interface Env {
  QUEUE_SERVICE: QueueService;
  DATA_SERVICE: DataService;
}
