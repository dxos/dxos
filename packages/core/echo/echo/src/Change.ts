//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import type * as Query from './Query.ts';

/**
 * One change to a document, as {@link Filter.changes} returns it: a plain, frozen record, not an
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

/** The metadata every change carries, whether it is a query row or an object's history entry. */
export type Metadata = Schema.Schema.Type<typeof Change>;

/**
 * One change to an object, as {@link Obj.getChanges} returns it: the document change's metadata plus
 * the value the change touched, as it read before and after. A plain, frozen record, not an entity.
 */
export interface ValueChange<T> extends Metadata {
  /** Id of the object the change touched. */
  readonly object: string;
  /** The property the history was filtered to, when {@link Obj.getChanges} was given one. */
  readonly property?: string;
  /** The document's frontier once the change applied; `Obj.getVersion(obj, heads)` reads the object as it left it. */
  readonly heads: readonly string[];
  /** The writer's commit message, if it gave one. */
  readonly message?: string;
  /** The value before the change; `undefined` where the object (or property) did not exist yet. */
  readonly before: T | undefined;
  /** The value after the change; `undefined` where the change removed the property. */
  readonly after: T | undefined;
}

/**
 * A change: with no type argument, one row of a {@link Filter.changes} query; with a type argument,
 * one entry of an object's history ({@link ValueChange}) whose `before`/`after` hold that type.
 */
export type Change<T = never> = [T] extends [never] ? Metadata & Query.RecordResult : ValueChange<T>;
