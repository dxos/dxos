//
// Copyright 2025 DXOS.org
//

import type { IdentityDid, SpaceId } from '@dxos/keys';

/**
 * Space archive is a way to export and import spaces.
 *
 * ## Structure
 *
 * A tar archive with files:
 *  - metadata.json -- JSON-encoded {@link SpaceArchiveMetadata} file.
 *  - documents
 *    - <document-id>.bin -- Automerge document.
 */

/**
 * Space archive version.
 * Used to track changes to the archive format.
 */
export enum SpaceArchiveVersion {
  V1 = 1,
}

/**
 * Space archive metadata.
 * Stored in the `metadata.json` file.
 */
export interface SpaceArchiveMetadata {
  /**
   * Archive version.
   */
  version: SpaceArchiveVersion;

  /**
   * Original space ID.
   */
  originalSpaceId?: SpaceId;

  /**
   * Created at timestamp.
   */
  createdAt?: number;

  /**
   * DID of the identity that exported the space.
   */
  exportedBy?: IdentityDid;

  /**
   * ECHO section.
   */
  echo?: {
    /**
     * Current root document in the automerge URL format.
     * @example "automerge:XXXXXXXXXXX"
     */
    currentRootUrl?: string;
  };
}

export const SpaceArchiveFileStructure = {
  metadata: 'metadata.json',
  documents: 'documents',
} as const;
