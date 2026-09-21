//
// Copyright 2026 DXOS.org
//

import { SpaceId } from '@dxos/keys';

/**
 * The space a registry row is filed under.
 *
 * Registry entities belong to no space, but `objectMeta.spaceId` is NOT NULL and every read path
 * is space-scoped, so they need an address that no real space can collide with: the all-zero key,
 * which is not the hash of any public key. It is a second line of defence only — the authoritative
 * mark is a non-empty `registryKey`, which is what the scans exclude on.
 */
export const REGISTRY_SPACE_ID: SpaceId = SpaceId.make(`B${'A'.repeat(32)}`);

/**
 * Splits a registry entry key into its unversioned prefix and version, or returns undefined when
 * the key carries no version. A key is versioned iff it is a DXN with a third colon-delimited
 * segment (`dxn:<nsid>:<version>`); an EID (`echo:///<id>`) never is.
 */
export const splitRegistryKey = (key: string): { unversioned: string; version: string } | undefined => {
  if (!key.startsWith('dxn:')) {
    return undefined;
  }
  const separator = key.indexOf(':', 'dxn:'.length);
  if (separator === -1) {
    return undefined;
  }
  return { unversioned: key.slice(0, separator), version: key.slice(separator + 1) };
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
