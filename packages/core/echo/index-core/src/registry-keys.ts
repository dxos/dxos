//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SpaceId } from '@dxos/keys';

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
 * 64-bit FNV-1a digest of a registered snapshot, hex encoded.
 *
 * Only ever compared for equality against a digest this function produced, so collision resistance
 * against an adversary is not what is being bought — a cheap, allocation-light hash over a JSON
 * string is, since it runs over the whole registry on every push.
 */
export const contentHash = (json: string): string => {
  // BigInt rather than the usual 32-bit trick: a 32-bit space collides at a few tens of thousands
  // of entries, and a collision here means a changed entity is silently never re-indexed.
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < json.length; index++) {
    hash = ((hash ^ BigInt(json.charCodeAt(index))) * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
};
