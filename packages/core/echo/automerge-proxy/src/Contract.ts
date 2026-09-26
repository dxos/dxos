//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// The asynchronous contract between tabs that hold tab documents and the host that holds the real
// Automerge documents. A change crosses as the change chunk Automerge would write for it, named by
// its hash, so both sides hold the same history and heads are real on both.
//

const mutableArray = <Value extends Schema.Top>(value: Value) => Schema.mutable(Schema.Array(value));

export const Heads = mutableArray(Schema.String);

/**
 * A document as the host saved it with uncompressed columns, every change's hash as 32 bytes in the
 * snapshot layout (actors sorted, each actor's hashes in seq order), and its heads. Answers a follow
 * whose heads the host does not hold.
 */
export const SnapshotEvent = Schema.Struct({
  type: Schema.Literal('snapshot'),
  documentId: Schema.String,
  bytes: Schema.Uint8Array,
  hashes: Schema.Uint8Array,
  heads: Heads,
});
export interface SnapshotEvent extends Schema.Schema.Type<typeof SnapshotEvent> {}

/** Changes the tab lacks, in causal order: from other tabs, from peers through sync, or since a follow's heads. */
export const ChangesEvent = Schema.Struct({
  type: Schema.Literal('changes'),
  documentId: Schema.String,
  changes: mutableArray(Schema.Uint8Array),
});

/** Ends the changes answering a follow whose heads the host holds; the tab now holds what the host does. */
export const CaughtUpEvent = Schema.Struct({
  type: Schema.Literal('caughtUp'),
  documentId: Schema.String,
});

/** The tab's changes a save covered, which a restart can no longer lose. */
export const AckEvent = Schema.Struct({
  type: Schema.Literal('ack'),
  documentId: Schema.String,
  hashes: Heads,
});

/** A change the host refused, which a correct tab never sends; the tab drops it and every change built on it. */
export const RefuseEvent = Schema.Struct({
  type: Schema.Literal('refuse'),
  documentId: Schema.String,
  hash: Schema.String,
  reason: Schema.String,
});

/**
 * A copy of a document the host keeps outside Automerge, such as an index, so it need not load the
 * document. `heads` are the Automerge heads of the copy. Sent again when the copy changes.
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
  ChangesEvent,
  CaughtUpEvent,
  AckEvent,
  RefuseEvent,
  CopyEvent,
  RequestingEvent,
  UnavailableEvent,
]);
export type DocumentEvent = Schema.Schema.Type<typeof DocumentEvent>;

export const EventBatch = Schema.Struct({ events: mutableArray(DocumentEvent) });
export interface EventBatch extends Schema.Schema.Type<typeof EventBatch> {}

/**
 * A document to follow. `heads` are the heads the tab holds, if any; the host answers with the changes
 * since them when it holds them all, and with a snapshot otherwise. `copy` asks for the host's copy of
 * the document, falling back to `live` when the host has no exact copy.
 */
export const Follow = Schema.Struct({
  documentId: Schema.String,
  heads: Schema.optional(Heads),
  mode: Schema.optional(Schema.Literals(['live', 'copy'])),
});
export interface Follow extends Schema.Schema.Type<typeof Follow> {}

/** A change a tab wrote or holds, as the chunk Automerge would write for it, and the hash the tab claims for it. */
export const Change = Schema.Struct({
  hash: Schema.String,
  bytes: Schema.Uint8Array,
});
export interface Change extends Schema.Schema.Type<typeof Change> {}

/** A tab's changes to one document, in causal order; the host checks each and answers with `ack` or `refuse`. */
export const SubmitBatch = Schema.Struct({
  documentId: Schema.String,
  changes: mutableArray(Change),
});
export interface SubmitBatch extends Schema.Schema.Type<typeof SubmitBatch> {}

export const SubmitResult = Schema.Struct({
  documentId: Schema.String,
  /**
   * `accepted`: checked, and each change is answered on the stream.
   * `unfollowed`: the subscription does not follow the document, so nothing was checked; the tab
   * follows it and sends again.
   */
  status: Schema.Literals(['accepted', 'unfollowed']),
});
export interface SubmitResult extends Schema.Schema.Type<typeof SubmitResult> {}
