//
// Copyright 2025 DXOS.org
//

/**
 * Common version helpers shared by Obj and Relation modules.
 *
 * NOTE: EntityVersion is used instead of Version to avoid conflict with types/version.ts.
 */

import { assertArgument } from '@dxos/invariant';

import { ObjectVersionId } from '../entities';
import { type AnyEntity, VersionTypeId } from '../types';

/**
 * Represent entity version.
 * May be backed by Automerge.
 * Entities with no history are not versioned.
 * Named EntityVersion to avoid conflict with types/version.ts.
 */
export interface EntityVersion {
  [VersionTypeId]: {};

  /**
   * Whether the entity is versioned.
   */
  versioned: boolean;

  /**
   * Automerge heads.
   */
  automergeHeads?: string[];
}

const unversioned: EntityVersion = {
  [VersionTypeId]: {},
  versioned: false,
};

/**
 * Checks that `obj` is a version object.
 */
export const isVersion = (entity: unknown): entity is EntityVersion => {
  return entity != null && typeof entity === 'object' && VersionTypeId in entity;
};

/**
 * Returns the version of an entity.
 * Accepts both reactive entities and snapshots.
 */
export const version = (entity: AnyEntity): EntityVersion => {
  const ver = (entity as any)[ObjectVersionId];
  if (ver === undefined) {
    return unversioned;
  }
  return ver;
};

/**
 * Checks that `version` is a valid version object.
 */
export const versionValid = (ver: EntityVersion): boolean => {
  assertArgument(isVersion(ver), 'version', 'Invalid version object');
  return !!ver.versioned;
};

export type VersionCompareResult = 'unversioned' | 'equal' | 'different';

/**
 * Compares two versions.
 * @param version1
 * @param version2
 * @returns 'unversioned' if either entity is unversioned, 'equal' if the versions are equal, 'different' if the versions are different.
 */
export const compareVersions = (version1: EntityVersion, version2: EntityVersion): VersionCompareResult => {
  assertArgument(isVersion(version1), 'version1', 'Invalid version object');
  assertArgument(isVersion(version2), 'version2', 'Invalid version object');

  if (!versionValid(version1) || !versionValid(version2)) {
    return 'unversioned';
  }

  if (version1.automergeHeads?.length !== version2.automergeHeads?.length) {
    return 'different';
  }
  if (version1.automergeHeads?.some((head) => !version2.automergeHeads?.includes(head))) {
    return 'different';
  }

  return 'equal';
};

export const encodeVersion = (ver: EntityVersion): string => {
  return JSON.stringify(ver);
};

export const decodeVersion = (ver: string): EntityVersion => {
  const parsed = JSON.parse(ver);
  parsed[VersionTypeId] = {};
  return parsed;
};
