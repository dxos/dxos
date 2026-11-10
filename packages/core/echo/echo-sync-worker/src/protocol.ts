//
// Copyright 2026 DXOS.org
//

/**
 * The sync wire format, shared by the client and the Durable Object.
 *
 * Ordering uses two counters and no clocks. The server keeps one sequence number per graph and stamps
 * every write it accepts with the next one, so `seq` is a total order that a drifting wall clock cannot
 * reorder. Each client keeps its own counter, `clientSeq`, which numbers its pushes so a retried push is
 * applied once and its answer can be matched to it.
 *
 * A round is pull → merge → push. A pushed record names the server `seq` it was edited on top of
 * (`base`); the server applies a push only if every record's `base` is still that record's current
 * `seq`. Otherwise it applies nothing and answers with what the client is missing, the client merges
 * that into its edits and pushes again. So no write is ever applied on top of a state its writer did
 * not see.
 *
 * Objects are identified by `key` — a foreign key carried in `Obj.Meta.keys` — rather than the ECHO
 * id, because `Obj.make` mints its own id and takes no `id` option, so two instances of the same
 * graph cannot share one.
 *
 * This module has no imports: the server half is deployed from its own directory.
 */

/** Marks this demo's foreign keys, so sync never matches a key from somewhere else. */
export const SOURCE = 'echo-sqlite-demo';

export type SyncRecord = {
  /** Stable across instances; the ECHO id is not. */
  readonly key: string;
  /** Fully-qualified type DXN. */
  readonly typename: string;
  /** Scalar properties only. */
  readonly props: Readonly<Record<string, unknown>>;
  /**
   * Outgoing references, by property name, to other records' `key`s; a list for a multi-valued edge,
   * and `null` for an edge the writer cleared — which an omitted property cannot say, since a ref
   * whose target is not resident is omitted too.
   */
  readonly refs: Readonly<Record<string, string | readonly string[] | null>>;
  readonly deleted?: boolean;
  /** The server sequence number of this version; absent on records a client is sending. */
  readonly seq?: number;
};

export type PushRecord = SyncRecord & {
  /**
   * The server `seq` of the version this edit was made on, or 0 for a new record. Omitted only by a
   * script that wants an unconditional write.
   */
  readonly base?: number;
};

/** A push, over the socket or as a POST body. */
export type PushRequest = {
  /** Identifies the client across reconnects, so a retried push is applied once. */
  readonly client?: string;
  /** The client's own counter: one per push, increasing. */
  readonly clientSeq?: number;
  /** The highest server `seq` this client has applied; the answer carries everything above it. */
  readonly since: number;
  readonly records: readonly PushRecord[];
};

/** What a client sends over the socket. */
export type ClientMessage =
  /** "Everything you have above this seq, please" — a first sync and a catch-up are the same message. */
  { readonly type: 'pull'; readonly since: number } | ({ readonly type: 'push' } & PushRequest);

/** What every answer carries about the store itself. */
export type StoreInfo = {
  /** The store's highest `seq`. */
  readonly seq: number;
  /**
   * Which incarnation of the store that seq belongs to, minted with the store and dropped with it.
   *
   * A graph expires and its alarm drops the store, so seqs start again from 0 — which the seq alone
   * cannot show, since another peer may already have pushed the new store past the seq a returning
   * client saved.
   */
  readonly incarnation: string;
  /** When this graph is deleted, as an epoch millisecond value. */
  readonly expiresAt: number;
};

/**
 * Records in seq order, covering everything above `from` up to `seq` — the answer to a pull, and the
 * broadcast of someone else's push. A client that has applied up to `from` can advance to `seq`.
 */
export type RecordsMessage = StoreInfo & {
  readonly type: 'records';
  readonly from: number;
  readonly records: readonly SyncRecord[];
};

/**
 * The answer to a push, to the pusher only. `records` is everything above the push's `since`: the
 * pushed records with their new seqs when accepted, and what the client had not seen when rejected.
 */
export type PushResult = StoreInfo & {
  readonly type: 'ack';
  readonly clientSeq?: number;
  readonly accepted: boolean;
  /** Keys whose `base` was not their current seq; empty when accepted. */
  readonly conflicts: readonly string[];
  readonly from: number;
  readonly records: readonly SyncRecord[];
};

export type ErrorMessage = { readonly type: 'error'; readonly message: string };

export type ServerMessage = RecordsMessage | PushResult | ErrorMessage;

/** The paths under `/api/space/<slug>/`: `sync` is one POST round trip, `socket` stays open. */
export const SYNC_PATH = 'sync';
export const SOCKET_PATH = 'socket';

/** Slugs name a graph in a URL, so keep them short and safe to type. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

export const randomSlug = (): string => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
};
