//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { createIdFromRootDocumentId } from './space-id';

/**
 * Type URI of the space root document, as a versioned DXN in the same form `EntitySystem.type`
 * carries. Spelled `type` rather than `@type` — the latter is the protobuf convention and appears
 * nowhere in ECHO document structure.
 */
export const SPACE_ROOT_TYPE = 'dxn:org.dxos.document.spaceRoot:0.1.0';

/**
 * How a space id was minted. A space migrated from the control-feed world has a root document whose
 * id does NOT derive its space id, so a reader cannot tell the two cases apart from the id alone.
 */
export type SpaceIdDerivation = 'rootDoc' | 'spaceKey';

/**
 * The immutable anchor of a space. Its document id derives the space id (for `rootDoc` spaces), so
 * it can never be rotated — which is why it holds nothing but references. Both references are
 * rotatable by writing this document.
 */
export interface SpaceRoot {
  type: typeof SPACE_ROOT_TYPE;

  spaceId: SpaceId;

  /** Redundant with {@link spaceId} for `rootDoc` spaces, and the only check available for `spaceKey` ones. */
  idDerivation: SpaceIdDerivation;

  /** Automerge URL (`automerge:<documentId>`) of the space directory ({@link DatabaseDirectory}). */
  directory: string;

  /** Automerge URL of the credentials document. Absent until the space migrates off the control feed. */
  credentials?: string;
}

export const isSpaceRoot = (doc: unknown): doc is SpaceRoot =>
  typeof doc === 'object' && doc !== null && (doc as SpaceRoot).type === SPACE_ROOT_TYPE;

/**
 * Whether a space root is internally consistent: for `rootDoc` derivation the space id must be
 * recomputable from the id of the document the root was fetched from. A mismatch means the root is
 * not the one that minted the id, so it must be rejected rather than trusted. Takes a document id
 * rather than a URL to keep this package free of an automerge dependency.
 */
export const verifySpaceRoot = async (root: SpaceRoot, documentId: string): Promise<boolean> => {
  if (root.idDerivation !== 'rootDoc') {
    return true;
  }

  return root.spaceId === (await createIdFromRootDocumentId(documentId));
};
