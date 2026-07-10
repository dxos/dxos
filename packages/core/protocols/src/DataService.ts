//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from '@effect/rpc/Rpc';
import type * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';
import { protoStruct } from './service-schemas.ts';

//
// RPC message schemas.
//

export const SubscribeRequest = Schema.Struct({
  subscriptionId: Schema.String,
  spaceId: Schema.String,
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const UpdateSubscriptionRequest = Schema.Struct({
  /**
   * Id of the subscription to update.
   * Subscription id is returned by `Subscribe` rpc.
   */
  subscriptionId: Schema.String,
  /**
   * Automerge document ids to subscribe for updates.
   * Used for already existing documents.
   * To add new document use `write` rpc.
   */
  addIds: Schema.optional(Schema.Array(Schema.String)),
  /**
   * Automerge document ids to unsubscribe from.
   */
  removeIds: Schema.optional(Schema.Array(Schema.String)),
});
export interface UpdateSubscriptionRequest extends Schema.Schema.Type<typeof UpdateSubscriptionRequest> {}

export const CreateDocumentRequest = Schema.Struct({
  /**
   * Space id where the document will be created.
   */
  spaceId: Schema.String,
  /**
   * Automerge encoded initial document value.
   * Optional - if not provided, an empty document will be created.
   */
  initialValue: Schema.optional(protoStruct),
});
export interface CreateDocumentRequest extends Schema.Schema.Type<typeof CreateDocumentRequest> {}

export const CreateDocumentResponse = Schema.Struct({
  /**
   * The generated document id.
   */
  documentId: Schema.String,
});
export interface CreateDocumentResponse extends Schema.Schema.Type<typeof CreateDocumentResponse> {}

export const DocumentUpdate = Schema.Struct({
  /**
   * Automerge document id.
   */
  documentId: Schema.String,
  /**
   * Automerge document incremental update.
   * Value returned by `Automerge.saveSince()`.
   * Optional: if absent, the update only carries a transition signal (e.g.
   * `requesting`) and not new bytes.
   */
  mutation: Schema.optional(Schema.Uint8Array),
  /**
   * Set by the worker when the disk probe for this document completes
   * negative — i.e. the document is not on local storage, and the worker
   * has started a network fetch. The client moves the corresponding
   * `DocHandleProxy` from `'pending'` to `'requesting'`. Once the bytes
   * eventually arrive, a normal `mutation` update follows and the handle
   * transitions to `'ready'`. Used by query-driven (disk-only) callers to
   * give up on a load without waiting on the network.
   */
  requesting: Schema.optional(Schema.Boolean),
});
export interface DocumentUpdate extends Schema.Schema.Type<typeof DocumentUpdate> {}

export const UpdateRequest = Schema.Struct({
  subscriptionId: Schema.String,
  updates: Schema.optional(Schema.Array(DocumentUpdate)),
});
export interface UpdateRequest extends Schema.Schema.Type<typeof UpdateRequest> {}

export const FlushRequest = Schema.Struct({
  /**
   * Automerge specific document ids to wait to flush.
   */
  documentIds: Schema.optional(Schema.Array(Schema.String)),
});
export interface FlushRequest extends Schema.Schema.Type<typeof FlushRequest> {}

export const GetDocumentHeadsRequest = Schema.Struct({
  documentIds: Schema.optional(Schema.Array(Schema.String)),
});
export interface GetDocumentHeadsRequest extends Schema.Schema.Type<typeof GetDocumentHeadsRequest> {}

export const Entry = Schema.Struct({
  documentId: Schema.String,
  heads: Schema.optional(Schema.Array(Schema.String)),
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}

export const DocHeadsList = Schema.Struct({
  entries: Schema.optional(Schema.Array(Entry)),
});
export interface DocHeadsList extends Schema.Schema.Type<typeof DocHeadsList> {}

export const GetDocumentHeadsResponse = Schema.Struct({
  heads: Schema.optional(DocHeadsList),
});
export interface GetDocumentHeadsResponse extends Schema.Schema.Type<typeof GetDocumentHeadsResponse> {}

export const WaitUntilHeadsReplicatedRequest = Schema.Struct({
  heads: Schema.optional(DocHeadsList),
});
export interface WaitUntilHeadsReplicatedRequest extends Schema.Schema.Type<typeof WaitUntilHeadsReplicatedRequest> {}

export const ReIndexHeadsRequest = Schema.Struct({
  documentIds: Schema.optional(Schema.Array(Schema.String)),
});
export interface ReIndexHeadsRequest extends Schema.Schema.Type<typeof ReIndexHeadsRequest> {}

export const GetSpaceSyncStateRequest = Schema.Struct({
  spaceId: Schema.String,
});
export interface GetSpaceSyncStateRequest extends Schema.Schema.Type<typeof GetSpaceSyncStateRequest> {}

/**
 * Effect RPC definitions for `dxos.echo.service.DataService`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  /**
   * Subscribe to incremental updates of multiple automerge socuments.
   * Which documents are subscribed to is defined in the `UpdateSubscription`.
   * Used to propagate changes from services to client.
   */
  Rpc.make('subscribe', {
    payload: SubscribeRequest,
    success: protoMessage('dxos.echo.service.BatchedDocumentUpdates'),
    error: serviceError,
    stream: true,
  }),
  /**
   * Change which documents are subscribed to for specific subscription.
   */
  Rpc.make('updateSubscription', {
    payload: UpdateSubscriptionRequest,
    error: serviceError,
  }),
  /**
   * Create a new automerge document.
   * Returns the generated document id which is controlled by the host.
   */
  Rpc.make('createDocument', {
    payload: CreateDocumentRequest,
    success: CreateDocumentResponse,
    error: serviceError,
  }),
  /**
   * Write incremental updates to multiple automerge documents.
   * Used to propagate changes from client to services.
   */
  Rpc.make('update', {
    payload: UpdateRequest,
    error: serviceError,
  }),
  Rpc.make('flush', {
    payload: FlushRequest,
    error: serviceError,
  }),
  Rpc.make('getDocumentHeads', {
    payload: GetDocumentHeadsRequest,
    success: GetDocumentHeadsResponse,
    error: serviceError,
  }),
  /**
   * Wait until the we have the specified changes on the worker locally. Does not take into account the index or client.
   */
  Rpc.make('waitUntilHeadsReplicated', {
    payload: WaitUntilHeadsReplicatedRequest,
    error: serviceError,
  }),
  /**
   * Update heads index for selected docuemnts.
   */
  Rpc.make('reIndexHeads', {
    payload: ReIndexHeadsRequest,
    error: serviceError,
  }),
  /**
   * Wait for any pending index updates.
   */
  Rpc.make('updateIndexes', {
    error: serviceError,
  }),
  Rpc.make('subscribeSpaceSyncState', {
    payload: GetSpaceSyncStateRequest,
    success: protoMessage('dxos.echo.service.SpaceSyncState'),
    error: serviceError,
    stream: true,
  }),
).prefix('DataService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
