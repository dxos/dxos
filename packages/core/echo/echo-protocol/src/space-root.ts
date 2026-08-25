//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl } from '@automerge/automerge-repo';

import { type SpaceId } from '@dxos/keys';

/** Versioned DXN in the same form `EntitySystem.type` carries; `@type` is the protobuf convention, absent from ECHO documents. */
export const SPACE_ROOT_TYPE = 'dxn:org.dxos.document.spaceRoot:0.1.0';

/**
 * The immutable anchor of a space: it can never be rotated and holds nothing but rotatable
 * references. The space id is derived from the space genesis key, not from this document, so the
 * root records the id rather than certifying it.
 */
export interface SpaceRoot {
  type: typeof SPACE_ROOT_TYPE;

  spaceId: SpaceId;

  /** The space directory ({@link DatabaseDirectory}). */
  directory: AutomergeUrl;

  /** Absent until the space migrates off the control feed. */
  credentials?: AutomergeUrl;
}

/** Whether a value is a space root. */
export const isSpaceRoot = (doc: unknown): doc is SpaceRoot =>
  typeof doc === 'object' && doc !== null && (doc as SpaceRoot).type === SPACE_ROOT_TYPE;
