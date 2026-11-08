//
// Copyright 2026 DXOS.org
//

/**
 * The sync wire format, shared by the client and the Durable Object.
 *
 * Objects are identified by `key` — a foreign key carried in `Obj.Meta.keys` — rather than the ECHO
 * id, because `Obj.make` mints its own id and takes no `id` option, so two instances of the same
 * graph cannot share one. Matching on a meta key is how ECHO correlates objects across sources
 * anyway.
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
  /** Outgoing references, by property name, to other records' `key`s; a list for a multi-valued edge. */
  readonly refs: Readonly<Record<string, string | readonly string[]>>;
  readonly deleted?: boolean;
  /** Assigned by the Durable Object; absent on records a client is sending. */
  readonly version?: number;
};

export type SyncRequest = {
  /** The highest version this client has applied; 0 on a first sync. */
  readonly since: number;
  /** Records changed locally since that version. */
  readonly records: readonly SyncRecord[];
};

export type SyncResponse = {
  /** The store's highest version after applying the request. */
  readonly version: number;
  /** Every record above the request's `since`, including the ones just applied. */
  readonly records: readonly SyncRecord[];
  /** When this graph is deleted, as an epoch millisecond value. */
  readonly expiresAt: number;
};

/** Slugs name a graph in a URL, so keep them short and safe to type. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,31}$/;

export const randomSlug = (): string => {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return [...bytes].map((byte) => alphabet[byte % alphabet.length]).join('');
};
