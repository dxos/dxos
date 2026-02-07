//
// Copyright 2024 DXOS.org
//

import { type Stream } from '@dxos/codec-protobuf/stream';

/**
 * Document update type for data service.
 */
export interface ServiceDocumentUpdate {
  documentId: string;
  mutation?: Uint8Array;
}

/**
 * Batched document updates type for data service.
 */
export interface ServiceBatchedUpdates {
  updates?: ServiceDocumentUpdate[];
}

/**
 * Space sync state peer type.
 */
export interface ServicePeerState {
  peerId?: string;
  missingOnRemote?: number;
  missingOnLocal?: number;
  differentDocuments?: number;
  localDocumentCount?: number;
  remoteDocumentCount?: number;
  totalDocumentCount?: number;
  unsyncedDocumentCount?: number;
}

/**
 * Space sync state type.
 */
export interface ServiceSpaceSyncState {
  peers?: ServicePeerState[];
}

/**
 * Query result type.
 */
export interface ServiceQueryResult {
  id?: string;
  spaceId?: string;
  documentId?: string;
  queueId?: string;
  queueNamespace?: string;
  rank?: number;
  documentJson?: string;
  documentAutomerge?: Uint8Array;
  spaceKey?: { data?: Uint8Array } | { asUint8Array(): Uint8Array };
}

/**
 * Query response type.
 */
export interface ServiceQueryResponse {
  queryId?: string;
  results?: ServiceQueryResult[];
}

/**
 * Index configuration type.
 */
export interface ServiceIndexConfig {
  enabled?: boolean;
  indexes?: Array<{
    kind?: number;
    field?: string;
  }>;
}

/**
 * Common data service interface.
 * Compatible with both protobuf.js and buf-based DataService implementations.
 */
export interface EchoDataService {
  subscribe(request: { subscriptionId: string; spaceId: string }): Stream<ServiceBatchedUpdates>;

  updateSubscription(
    request: { subscriptionId: string; addIds?: string[]; removeIds?: string[] },
    options?: { timeout?: number },
  ): Promise<unknown>;

  createDocument(
    request: { spaceId: string; initialValue?: unknown },
    options?: { timeout?: number },
  ): Promise<{ documentId: string }>;

  update(
    request: { subscriptionId: string; updates?: Array<{ documentId: string; mutation?: Uint8Array }> },
    options?: { timeout?: number },
  ): Promise<unknown>;

  flush(request: { documentIds?: string[] }, options?: { timeout?: number }): Promise<unknown>;

  getDocumentHeads(
    request: { documentIds?: string[] },
    options?: { timeout?: number },
  ): Promise<{ heads?: { entries?: Array<{ documentId?: string; heads?: string[] }> } }>;

  waitUntilHeadsReplicated(
    request: { heads?: { entries?: Array<{ documentId?: string; heads?: string[] }> } },
    options?: { timeout?: number },
  ): Promise<unknown>;

  reIndexHeads(request: { documentIds?: string[] }, options?: { timeout?: number }): Promise<unknown>;

  updateIndexes(options?: { timeout?: number }): Promise<unknown>;

  subscribeSpaceSyncState(request: { spaceId: string }): Stream<ServiceSpaceSyncState>;
}

/**
 * Common query service interface.
 * Compatible with both protobuf.js and buf-based QueryService implementations.
 */
export interface EchoQueryService {
  execQuery(
    request: {
      queryId?: string;
      query: string;
      filter?: string;
      reactivity?: number;
    },
    options?: { timeout?: number },
  ): Stream<ServiceQueryResponse>;

  reindex(options?: { timeout?: number }): Promise<unknown>;

  setConfig(request: ServiceIndexConfig, options?: { timeout?: number }): Promise<unknown>;
}
