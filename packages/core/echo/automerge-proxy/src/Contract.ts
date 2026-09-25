//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// The asynchronous contract between clients that keep proxies of documents and the host that holds the
// real Automerge documents. Ops and values are structured-clone data in `Op`'s shapes; `Wire` tags the
// values structured clone and JSON cannot carry.
//

const mutableArray = <Value extends Schema.Top>(value: Value) => Schema.mutable(Schema.Array(value));

export const Heads = mutableArray(Schema.String);

export const Origin = Schema.Struct({
  clientId: Schema.String,
  batchId: Schema.String,
  /**
   * Set when the host refused this change of the batch, counted from zero: it wrote the changes before
   * it and none after, and the client sends the later ones again.
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

/** Full state of a document for a client that has no usable history of it. */
export const SnapshotEvent = Schema.Struct({
  type: Schema.Literal('snapshot'),
  documentId: Schema.String,
  epoch: Schema.String,
  version: Schema.Number,
  heads: Heads,
  value: Schema.Unknown,
  /** Whether `value` contains the in-flight batch the resubscribing client named in `Known.inflight`. */
  applied: Schema.optional(Schema.Boolean),
  /** Set with `applied` when the host refused a change of that batch; as in `Origin`. */
  refusedAt: Schema.optional(Schema.Number),
});

/** The next step of a document's history, in the host's order. */
export const EntryEvent = Schema.Struct({
  type: Schema.Literal('entry'),
  documentId: Schema.String,
  epoch: Schema.String,
  entry: Entry,
});

/**
 * What happened after a resubscribing client's confirmed heads, rebuilt from Automerge history by a
 * host that restarted, followed by the new host's numbering. Sent only to a client that knew another
 * epoch; the origins in `entries` settle whether its in-flight batch was applied.
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
 * Ends the entries answering a client that resubscribed to the same host. The client holds everything
 * through `version`, so an in-flight batch it has seen no entry for was not applied and never will be.
 */
export const CaughtUpEvent = Schema.Struct({
  type: Schema.Literal('caughtUp'),
  documentId: Schema.String,
  epoch: Schema.String,
  version: Schema.Number,
});

/**
 * A copy of a document the host keeps outside Automerge, such as an index, so it need not load the
 * document. `heads` are the Automerge heads of the copy, so a client that writes later resubscribes
 * live from them and receives what changed since. Sent again when the copy changes.
 */
export const CopyEvent = Schema.Struct({
  type: Schema.Literal('copy'),
  documentId: Schema.String,
  heads: Heads,
  value: Schema.Unknown,
});

/** A copy of a document kept outside Automerge, as a {@link CopyEvent} carries it. */
export type Copy = { readonly heads: string[]; readonly value: unknown };

/** The document is not in the host's storage; it is being fetched. */
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
  CopyEvent,
  RequestingEvent,
  UnavailableEvent,
]);
export type DocumentEvent = Schema.Schema.Type<typeof DocumentEvent>;

export const EventBatch = Schema.Struct({ events: mutableArray(DocumentEvent) });
export interface EventBatch extends Schema.Schema.Type<typeof EventBatch> {}

/** What a resubscribing client already holds of a document. */
export const Known = Schema.Struct({
  epoch: Schema.String,
  version: Schema.Number,
  heads: Heads,
  /** The batch the client has in flight, whose fate the answer settles. */
  inflight: Schema.optional(Schema.String),
});
export interface Known extends Schema.Schema.Type<typeof Known> {}

/**
 * A document to follow. `copy` asks for the host's copy of it, falling back to `live` when the host
 * has no exact copy.
 */
export const Follow = Schema.Struct({
  documentId: Schema.String,
  known: Schema.optional(Known),
  mode: Schema.optional(Schema.Literals(['live', 'copy'])),
});
export interface Follow extends Schema.Schema.Type<typeof Follow> {}

export const SubmitBatch = Schema.Struct({
  documentId: Schema.String,
  epoch: Schema.String,
  batchId: Schema.String,
  baseVersion: Schema.Number,
  /** The ops of each `change()` call, in order; the host writes each whole or refuses it. */
  changes: mutableArray(mutableArray(Schema.Unknown)),
});
export interface SubmitBatch extends Schema.Schema.Type<typeof SubmitBatch> {}

export const SubmitResult = Schema.Struct({
  documentId: Schema.String,
  batchId: Schema.String,
  /**
   * `applied`: saved, and its entry is on the subscription stream. The entry's `origin.refusedAt` says
   * whether the host refused one of its changes.
   * `resync`: based on history the host no longer holds, and not applied.
   * `stale`: not applied: sent to another host's epoch, or before the subscription followed the document.
   * On `resync` and `stale` the client resubscribes, and the answer settles the batch.
   */
  status: Schema.Literals(['applied', 'resync', 'stale']),
});
export interface SubmitResult extends Schema.Schema.Type<typeof SubmitResult> {}

/**
 * Cursors are resolved and created against the client's confirmed heads, which the host reads with
 * `A.view`, so the answer is in the client's own coordinates; the client then moves positions through
 * its unconfirmed edits and every later change locally.
 */
export const ResolveCursors = Schema.Struct({
  documentId: Schema.String,
  path: mutableArray(Schema.Union([Schema.String, Schema.Number])),
  heads: Heads,
  cursors: mutableArray(Schema.String),
});
export interface ResolveCursors extends Schema.Schema.Type<typeof ResolveCursors> {}

export const CreateCursors = Schema.Struct({
  documentId: Schema.String,
  path: mutableArray(Schema.Union([Schema.String, Schema.Number])),
  heads: Heads,
  positions: mutableArray(Schema.Number),
});
export interface CreateCursors extends Schema.Schema.Type<typeof CreateCursors> {}
