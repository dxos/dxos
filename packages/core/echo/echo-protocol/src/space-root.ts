//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { createIdFromRootDocumentId } from './space-id';

/** Versioned DXN in the same form `EntitySystem.type` carries; `@type` is the protobuf convention, absent from ECHO documents. */
export const SPACE_ROOT_TYPE = 'dxn:org.dxos.document.spaceRoot:0.1.0';

/** How a space id was minted — a migrated space has a root whose id does NOT derive its space id, and nothing else distinguishes the two. */
export type SpaceIdDerivation = 'rootDoc' | 'spaceKey';

export const isSpaceIdDerivation = (value: unknown): value is SpaceIdDerivation =>
  value === 'rootDoc' || value === 'spaceKey';

/** The immutable anchor of a space: its document id derives the space id, so it can never be rotated and holds nothing but rotatable references. */
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

/**
 * Whether a value is a space root. Checks the derivation too, so an unrecognized discriminator cannot
 * reach {@link verifySpaceRoot} and be waved through as the unverifiable `spaceKey` case.
 */
export const isSpaceRoot = (doc: unknown): doc is SpaceRoot =>
  typeof doc === 'object' &&
  doc !== null &&
  (doc as SpaceRoot).type === SPACE_ROOT_TYPE &&
  isSpaceIdDerivation((doc as SpaceRoot).idDerivation);

/**
 * Whether the root was fetched from the document that minted its space id. Takes a document id rather
 * than a URL to keep this package free of an automerge dependency.
 */
export const verifySpaceRoot = async (root: SpaceRoot, documentId: string): Promise<boolean> => {
  switch (root.idDerivation) {
    case 'spaceKey':
      return true;
    case 'rootDoc':
      return root.spaceId === (await createIdFromRootDocumentId(documentId));
    default:
      return false;
  }
};
