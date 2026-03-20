//
// Copyright 2025 DXOS.org
//

import type { DocumentId } from '@automerge/automerge-repo';

import { assertArgument, failedInvariant, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  type FeedArchiveBlock,
  type FeedArchiveMetadata,
  SpaceArchiveFileStructure,
  type SpaceArchiveMetadata,
} from '@dxos/protocols';
import type { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

/**
 * Extracted feed data from the archive.
 */
export type ExtractedFeed = {
  metadata: FeedArchiveMetadata;
  blocks: FeedArchiveBlock[];
};

export type ExtractedSpaceArchive = {
  metadata: SpaceArchiveMetadata;
  documents: Record<DocumentId, Uint8Array>;
  feeds: Record<string, ExtractedFeed>;
};

export const extractSpaceArchive = async (archive: SpaceArchive): Promise<ExtractedSpaceArchive> => {
  const { Archive } = await import('@obsidize/tar-browserify');
  const { entries } = await Archive.extract(archive.contents);
  const metadataEntry = entries.find((entry) => entry.fileName === SpaceArchiveFileStructure.metadata);
  assertArgument(metadataEntry, 'metadataEntry', 'Metadata entry not found');
  const metadata = JSON.parse(metadataEntry.getContentAsText());
  const documents: Record<DocumentId, Uint8Array> = {};
  for (const entry of entries.filter((entry) => entry.fileName.startsWith(`${SpaceArchiveFileStructure.documents}/`))) {
    const documentId = entry.fileName
      .replace(`${SpaceArchiveFileStructure.documents}/`, '')
      .replace(/\.bin$/, '') as DocumentId;
    invariant(!documentId.includes('/'));
    documents[documentId] = entry.content ?? failedInvariant();
  }

  const feeds: Record<string, ExtractedFeed> = {};
  const feedsPrefix = `${SpaceArchiveFileStructure.feeds}/`;
  const feedEntries = entries.filter((entry) => entry.fileName.startsWith(feedsPrefix));

  const feedMetadataByFeedId = new Map<string, FeedArchiveMetadata>();
  const feedBlocksByFeedId = new Map<string, Map<number, FeedArchiveBlock[]>>();

  for (const entry of feedEntries) {
    const relativePath = entry.fileName.slice(feedsPrefix.length);
    const pathParts = relativePath.split('/');
    if (pathParts.length !== 2) {
      continue;
    }

    const [feedId, fileName] = pathParts;
    invariant(feedId, 'Feed ID is required');
    invariant(fileName, 'File name is required');

    if (fileName === SpaceArchiveFileStructure.feedMetadata) {
      const feedMetadata = JSON.parse(entry.getContentAsText()) as FeedArchiveMetadata;
      feedMetadataByFeedId.set(feedId, feedMetadata);
    } else if (fileName.startsWith(SpaceArchiveFileStructure.feedBlocksPrefix) && fileName.endsWith('.json')) {
      const chunkIndexStr = fileName
        .slice(SpaceArchiveFileStructure.feedBlocksPrefix.length)
        .replace(/\.json$/, '');
      const chunkIndex = parseInt(chunkIndexStr, 10);
      invariant(!isNaN(chunkIndex), `Invalid chunk index: ${chunkIndexStr}`);

      const blocks = JSON.parse(entry.getContentAsText()) as FeedArchiveBlock[];
      if (!feedBlocksByFeedId.has(feedId)) {
        feedBlocksByFeedId.set(feedId, new Map());
      }
      feedBlocksByFeedId.get(feedId)!.set(chunkIndex, blocks);
    }
  }

  for (const [feedId, feedMetadata] of feedMetadataByFeedId) {
    const blockChunks = feedBlocksByFeedId.get(feedId) ?? new Map<number, FeedArchiveBlock[]>();
    const sortedChunkIndices = Array.from(blockChunks.keys()).sort((a, b) => a - b);
    const allBlocks: FeedArchiveBlock[] = [];
    for (const chunkIndex of sortedChunkIndices) {
      allBlocks.push(...blockChunks.get(chunkIndex)!);
    }
    feeds[feedId] = {
      metadata: feedMetadata,
      blocks: allBlocks,
    };
  }

  log('extracted space archive', { metadata, documents, feedCount: Object.keys(feeds).length });
  return { metadata, documents, feeds };
};
