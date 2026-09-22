//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';
import { fnv1a64 } from '@dxos/util';

/**
 * Which data source an indexed row came from, recorded in `objectMeta.origin`.
 *
 * `feed` names {@link FeedDataSource}, whose cursors still use the older resource name `queue`;
 * the column says where the object came from, not what its cursor is filed under.
 */
export const IndexOrigin = Schema.Literals(['automerge', 'feed', 'registry']);
export type IndexOrigin = typeof IndexOrigin.Type;

/** Rows sourced from a space; the value every scan but the registry read admits. */
export const ORIGIN_AUTOMERGE: IndexOrigin = 'automerge';
export const ORIGIN_FEED: IndexOrigin = 'feed';
export const ORIGIN_REGISTRY: IndexOrigin = 'registry';

/**
 * The space a registry row is filed under.
 *
 * Registry entities belong to no space, but `objectMeta.spaceId` is NOT NULL and every read path
 * is space-scoped, so they need an address that no real space can collide with: the all-zero key,
 * which is not the hash of any public key. It is a second line of defence only — the authoritative
 * mark is `origin = 'registry'`, which is what the scans exclude on.
 */
export const REGISTRY_SPACE_ID: SpaceId = SpaceId.make(`B${'A'.repeat(32)}`);

/**
 * The normalized identity of a registry row: the entity's name and, separately, its version.
 *
 * Two columns rather than one composed key, so an unversioned lookup is an equality match on
 * `name` instead of a LIKE prefix, and so the version is a value the index can order and compare
 * rather than a suffix to parse back out.
 */
export interface RegistryIdentity {
  readonly name: string;
  /** Empty when the entity carries no version — an unversioned entry, distinct from every versioned one. */
  readonly version: string;
}

/**
 * Splits a registry entry key into {@link RegistryIdentity}.
 *
 * The fallback for an entity whose metadata carries no key of its own: a key is versioned iff it
 * is a DXN with a third colon-delimited segment (`dxn:<nsid>:<version>`); an EID (`echo:///<id>`)
 * never is.
 */
export const splitRegistryKey = (key: string): RegistryIdentity => {
  if (!key.startsWith('dxn:')) {
    return { name: key, version: '' };
  }
  const separator = key.indexOf(':', 'dxn:'.length);
  if (separator === -1) {
    return { name: key, version: '' };
  }
  return { name: key.slice(0, separator), version: key.slice(separator + 1) };
};

/**
 * Digest of a registered snapshot.
 *
 * Only ever compared for equality against a digest this function produced, so collision resistance
 * against an adversary is not what is being bought — a cheap hash over a JSON string is, since it
 * runs over the whole registry on every push. 64 bits because a collision here means a changed
 * entity is silently never re-indexed.
 */
export const contentHash = (json: string): string => fnv1a64(json);
