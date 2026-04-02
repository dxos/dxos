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
 *  - documents/
 *    - <document-id>.bin -- Automerge document.
 *  - feeds/
 *    - <feed-id>/
 *      - metadata.json -- JSON-encoded {@link FeedArchiveMetadata} file.
 *      - blocks-0.json -- JSON array of {@link FeedArchiveBlock} (chunks of 100).
 *      - blocks-1.json -- ...
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

/**
 * Feed metadata stored in `feeds/<feed-id>/metadata.json`.
 */
export interface FeedArchiveMetadata {
  /**
   * Feed identifier.
   */
  id: string;

  /**
   * Feed namespace (e.g., 'data', 'trace').
   */
  namespace: string;
}

/**
 * Feed block stored in `feeds/<feed-id>/blocks-N.json`.
 * Represents a single block from the feed.
 */
export interface FeedArchiveBlock {
  /**
   * Actor that produced this block.
   */
  actorId: string;

  /**
   * Per-feed monotonic sequence assigned by the actor.
   */
  sequence: number;

  /**
   * Actor of the immediate predecessor block, if any.
   */
  prevActorId: string | null;

  /**
   * Sequence of the immediate predecessor block, if any.
   */
  prevSequence: number | null;

  /**
   * Globally ordered position assigned by a position authority.
   */
  position: number | null;

  /**
   * Milliseconds since Unix epoch when the block was created.
   */
  timestamp: number;

  /**
   * Base64-encoded serialized application payload.
   */
  data: string;
}

/**
 * Number of blocks per chunk file.
 */
export const FEED_ARCHIVE_BLOCKS_PER_CHUNK = 100;

export const SpaceArchiveFileStructure = {
  metadata: 'metadata.json',
  documents: 'documents',
  feeds: 'feeds',
  feedMetadata: 'metadata.json',
  feedBlocksPrefix: 'blocks-',
} as const;
