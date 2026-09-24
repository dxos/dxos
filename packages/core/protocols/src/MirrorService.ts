//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import { serviceError } from './service-rpc.ts';
import { mutableArray } from './service-schemas.ts';

//
// Document sync for clients that keep JSON mirrors instead of Automerge replicas.
// Ops and values are structured-clone data; their shape is defined by `Mirror` in @dxos/echo-protocol.
//

const Heads = mutableArray(Schema.String);

export const Origin = Schema.Struct({
  clientId: Schema.String,
  batchId: Schema.String,
  /**
   * Set when the worker refused this change of the batch, counted from zero: it wrote the changes
   * before it and none after, and the tab sends the later ones again.
   */
  refusedAt: Schema.optional(Schema.Number),
});

export const Entry = Schema.Struct({
  version: Schema.Number,
  ops: mutableArray(Schema.Unknown),
  heads: Heads,
  origin: Schema.optional(Origin),
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}

export const RecoveredEntry = Schema.Struct({
  ops: mutableArray(Schema.Unknown),
  heads: Heads,
  origin: Schema.optional(Origin),
});
export interface RecoveredEntry extends Schema.Schema.Type<typeof RecoveredEntry> {}

/** Full state of a document for a tab that has no usable history of it. */
export const SnapshotEvent = Schema.Struct({
  type: Schema.Literal('snapshot'),
  documentId: Schema.String,
  epoch: Schema.String,
  version: Schema.Number,
  heads: Heads,
  value: Schema.Unknown,
  /** Whether `value` contains the in-flight batch the resubscribing tab named in `Known.inflight`. */
  applied: Schema.optional(Schema.Boolean),
  /** Set with `applied` when the worker refused a change of that batch; as in `Origin`. */
  refusedAt: Schema.optional(Schema.Number),
});

/** The next step of a document's history, in the worker's order. */
export const EntryEvent = Schema.Struct({
  type: Schema.Literal('entry'),
  documentId: Schema.String,
  epoch: Schema.String,
  entry: Entry,
});

/**
 * What happened after a resubscribing tab's confirmed heads, rebuilt from Automerge history by a
 * worker that restarted, followed by the new worker's numbering. Sent only to a tab that knew
 * another epoch; the origins in `entries` settle whether its in-flight batch was applied.
 */
export const RecoveredEvent = Schema.Struct({
  type: Schema.Literal('recovered'),
  documentId: Schema.String,
  epoch: Schema.String,
  version: Schema.Number,
  heads: Heads,
  entries: mutableArray(RecoveredEntry),
});

/**
 * Ends the entries answering a tab that resubscribed to the same worker. The tab holds everything
 * through `version`, so an in-flight batch it has seen no entry for was not applied and never will be.
 */
export const CaughtUpEvent = Schema.Struct({
  type: Schema.Literal('caughtUp'),
  documentId: Schema.String,
  epoch: Schema.String,
  version: Schema.Number,
});

/**
 * A document read from the worker's index instead of its Automerge copy, which the worker then need
 * not load. `heads` are the Automerge heads the index read it at, so a tab that writes later
 * resubscribes live from them and receives what changed since. Sent again when the index changes.
 */
export const IndexedEvent = Schema.Struct({
  type: Schema.Literal('indexed'),
  documentId: Schema.String,
  heads: Heads,
  value: Schema.Unknown,
});

/** The document is not on the worker's disk; it is being fetched from the network. */
export const RequestingEvent = Schema.Struct({
  type: Schema.Literal('requesting'),
  documentId: Schema.String,
});

/** The host cannot produce the document: not stored and nothing to fetch it from. */
export const UnavailableEvent = Schema.Struct({
  type: Schema.Literal('unavailable'),
  documentId: Schema.String,
});

export const DocumentEvent = Schema.Union([
  SnapshotEvent,
  EntryEvent,
  RecoveredEvent,
  CaughtUpEvent,
  IndexedEvent,
  RequestingEvent,
  UnavailableEvent,
]);
export type DocumentEvent = Schema.Schema.Type<typeof DocumentEvent>;

export const EventBatch = Schema.Struct({ events: mutableArray(DocumentEvent) });
export interface EventBatch extends Schema.Schema.Type<typeof EventBatch> {}

export const SubscribeRequest = Schema.Struct({
  subscriptionId: Schema.String,
  /** Random per tab session; tags this tab's batches in the log and in Automerge change messages. */
  clientId: Schema.String,
  spaceId: Schema.String,
});
export interface SubscribeRequest extends Schema.Schema.Type<typeof SubscribeRequest> {}

export const Known = Schema.Struct({
  epoch: Schema.String,
  version: Schema.Number,
  heads: Heads,
  /** The batch the tab has in flight, whose fate the answer settles. */
  inflight: Schema.optional(Schema.String),
});
export interface Known extends Schema.Schema.Type<typeof Known> {}

export const UpdateSubscriptionRequest = Schema.Struct({
  subscriptionId: Schema.String,
  /**
   * Documents to follow, with what the tab already holds when it is resubscribing. `indexed` asks for
   * the document as the index holds it, falling back to `live` when the index has no exact copy.
   */
  add: Schema.optional(
    mutableArray(
      Schema.Struct({
        documentId: Schema.String,
        known: Schema.optional(Known),
        mode: Schema.optional(Schema.Literals(['live', 'indexed'])),
      }),
    ),
  ),
  remove: Schema.optional(mutableArray(Schema.String)),
});
export interface UpdateSubscriptionRequest extends Schema.Schema.Type<typeof UpdateSubscriptionRequest> {}

export const SubmitRequest = Schema.Struct({
  subscriptionId: Schema.String,
  batches: mutableArray(
    Schema.Struct({
      documentId: Schema.String,
      epoch: Schema.String,
      batchId: Schema.String,
      baseVersion: Schema.Number,
      /** The ops of each `change()` call, in order; the worker writes each whole or refuses it. */
      changes: mutableArray(mutableArray(Schema.Unknown)),
    }),
  ),
});
export interface SubmitRequest extends Schema.Schema.Type<typeof SubmitRequest> {}

export const SubmitResult = Schema.Struct({
  documentId: Schema.String,
  batchId: Schema.String,
  /**
   * `applied`: saved, and its entry is on the subscription stream. The entry's `origin.refusedAt` says
   * whether the worker refused one of its changes.
   * `resync`: based on history the worker no longer holds, and not applied.
   * `stale`: not applied: sent to another worker's epoch, or before the subscription followed the document.
   * On `resync` and `stale` the tab resubscribes, and the answer settles the batch.
   */
  status: Schema.Literals(['applied', 'resync', 'stale']),
});

export const SubmitResponse = Schema.Struct({ results: mutableArray(SubmitResult) });
export interface SubmitResponse extends Schema.Schema.Type<typeof SubmitResponse> {}

/**
 * Cursors are resolved and created against the tab's confirmed heads, which the worker reads with
 * `A.view`, so the answer is in the tab's own coordinates; the tab then moves positions through its
 * unconfirmed edits and every later change locally.
 */
export const ResolveCursorsRequest = Schema.Struct({
  documentId: Schema.String,
  path: mutableArray(Schema.Union([Schema.String, Schema.Number])),
  heads: Heads,
  cursors: mutableArray(Schema.String),
});
export interface ResolveCursorsRequest extends Schema.Schema.Type<typeof ResolveCursorsRequest> {}

export const ResolveCursorsResponse = Schema.Struct({ positions: mutableArray(Schema.NullOr(Schema.Number)) });
export interface ResolveCursorsResponse extends Schema.Schema.Type<typeof ResolveCursorsResponse> {}

export const CreateCursorsRequest = Schema.Struct({
  documentId: Schema.String,
  path: mutableArray(Schema.Union([Schema.String, Schema.Number])),
  heads: Heads,
  positions: mutableArray(Schema.Number),
});
export interface CreateCursorsRequest extends Schema.Schema.Type<typeof CreateCursorsRequest> {}

export const CreateCursorsResponse = Schema.Struct({ cursors: mutableArray(Schema.NullOr(Schema.String)) });
export interface CreateCursorsResponse extends Schema.Schema.Type<typeof CreateCursorsResponse> {}

export class Rpcs extends RpcGroup.make(
  /** Stream of document events for the documents a subscription follows. */
  Rpc.make('subscribe', {
    payload: SubscribeRequest,
    success: EventBatch,
    error: serviceError,
    stream: true,
  }),
  Rpc.make('updateSubscription', {
    payload: UpdateSubscriptionRequest,
    error: serviceError,
  }),
  /** Applies tab batches; resolves once they are saved and their entries are on the stream. */
  Rpc.make('submit', {
    payload: SubmitRequest,
    success: SubmitResponse,
    error: serviceError,
  }),
  /** Positions of Automerge cursors (comments, remote presence) in a text. */
  Rpc.make('resolveCursors', {
    payload: ResolveCursorsRequest,
    success: ResolveCursorsResponse,
    error: serviceError,
  }),
  /** Automerge cursors for positions a tab saw (new anchors, the local selection). */
  Rpc.make('createCursors', {
    payload: CreateCursorsRequest,
    success: CreateCursorsResponse,
    error: serviceError,
  }),
).prefix('MirrorService.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}

export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}

export class Tag extends Context.Service<Tag, Handlers>()('@dxos/protocols/rpc/MirrorService') {}
