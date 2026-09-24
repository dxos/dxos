//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type * as Query from './Query.ts';

/**
 * One change to an object, as {@link Filter.changes} returns it: a plain, frozen record, not an
 * entity. It cannot be added to a database, referenced or mutated.
 */
export const Change = Schema.Struct({
  /** Unique among a query's results: the Automerge change hash for a document change. */
  key: Schema.String,
  /** Where the change is stored; only documents report changes today. */
  source: Schema.Literals(['document', 'feed']),
  /** The author's clock when the change was made, unix ms. */
  time: Schema.Number,
  /** Writer that made the change; for a document change, an Automerge actor, which is a device, not a member. */
  actor: Schema.String,
  /** The actor's sequence number for this change. */
  seq: Schema.Number,
  /**
   * Primitive writes in the change, at the storage's granularity: Automerge ops (a field set, a
   * character inserted) for a document change; 1 for a feed block, which writes one whole object.
   * Compare sums within one `source`.
   */
  ops: Schema.Number,
});

export type Change = Schema.Schema.Type<typeof Change> & Query.RecordResult;
