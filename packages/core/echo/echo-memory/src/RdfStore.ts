//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import { BaseError } from '@dxos/errors';

import * as MemoryQuery from './MemoryQuery.ts';

//
// The store a memory runs on: a space's quads, read with SPARQL and changed by batches of writes. A memory turns its
// operations into these calls, so the same memory runs over a store in the page, in a worker, or across RPC.
//

/** A triple in the default graph, or a quad in the named graph `g`. */
export const Quad = Schema.Struct({
  s: MemoryQuery.SparqlTerm,
  p: MemoryQuery.SparqlTerm,
  o: MemoryQuery.SparqlTerm,
  g: Schema.optional(MemoryQuery.SparqlTerm),
});
export interface Quad extends Schema.Schema.Type<typeof Quad> {}

/** Adds quads; one already stored is kept once. */
export const Insert = Schema.TaggedStruct('insert', { quads: Schema.Array(Quad) });
export interface Insert extends Schema.Schema.Type<typeof Insert> {}

/** Removes quads; one not stored is ignored. */
export const Delete = Schema.TaggedStruct('delete', { quads: Schema.Array(Quad) });
export interface Delete extends Schema.Schema.Type<typeof Delete> {}

/** Removes every quad of the part written to. */
export const Clear = Schema.TaggedStruct('clear', {});
export interface Clear extends Schema.Schema.Type<typeof Clear> {}

/** One change to the store. */
export const Write = Schema.Union([Insert, Delete, Clear]);
export type Write = Schema.Schema.Type<typeof Write>;

/** Writes recorded together and applied together, in order. */
export const Batch = Schema.Struct({ id: Schema.String, writes: Schema.Array(Write) });
export interface Batch extends Schema.Schema.Type<typeof Batch> {}

/**
 * How quads move in and out in bulk. `trig`: the Turtle family's text syntax with named graphs, which every fact is
 * stored in and plain Turtle cannot express. `binary`: a term dictionary and the quads as indexes into it, several
 * times smaller and faster to read, for copies between stores.
 */
export const Format = Schema.Literals(['trig', 'binary']);
export type Format = Schema.Schema.Type<typeof Format>;

/** The store refused, could not be reached, or the input does not parse; the message says which. */
export class RdfStoreError extends BaseError.extend('RdfStoreError', 'RDF store operation failed.') {}

export type QueryOptions = {
  /** Reads the store's local part instead of its shared part. */
  readonly local?: boolean;
};

export type WriteOptions = {
  /**
   * Writes the store's local part: kept on this device only, never replicated, and untouched by a `clear` of the
   * shared part. A memory keeps its subscriptions and their undelivered events there.
   */
  readonly local?: boolean;
};

/**
 * A space's quads in two parts. The shared part is replicated: a write is recorded durably before it is applied, and
 * every replica applies the same batches in the same order. The local part is this device's own.
 */
export interface Service {
  /** Runs a SPARQL read (SELECT, ASK or CONSTRUCT); an update fails, since changes go through {@link write}. */
  readonly query: (
    sparql: string,
    options?: QueryOptions,
  ) => Effect.Effect<readonly MemoryQuery.SparqlRow[], RdfStoreError>;

  /** Applies the writes as one batch and returns its id, once it is durable (shared) or written (local). */
  readonly write: (writes: readonly Write[], options?: WriteOptions) => Effect.Effect<string, RdfStoreError>;

  /** Every quad of the shared part, serialized where the store is, so a large store crosses a boundary once. */
  readonly export: (format: Format) => Effect.Effect<Uint8Array, RdfStoreError>;

  /** Parses the data where the store is and inserts its quads into the shared part as one batch; returns its id. */
  readonly import: (data: Uint8Array, format: Format) => Effect.Effect<string, RdfStoreError>;

  /**
   * Calls `onApplied` with each batch of the shared part once it is applied, this replica's and other replicas' alike,
   * in the order applied, until the scope closes. The listener is registered before this returns, so a reader that
   * listens and then reads misses nothing.
   */
  readonly listen: (onApplied: (batch: Batch) => void) => Effect.Effect<void, never, Scope.Scope>;
}

export class RdfStore extends Context.Service<RdfStore, Service>()('@dxos/echo-memory/RdfStore') {}
