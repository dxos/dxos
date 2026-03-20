//
// Copyright 2025 DXOS.org
//

import type { DocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { SpaceId } from '@dxos/keys';
import {
  FEED_ARCHIVE_BLOCKS_PER_CHUNK,
  type FeedArchiveBlock,
  SpaceArchiveFileStructure,
  SpaceArchiveVersion,
} from '@dxos/protocols';

import { extractSpaceArchive } from './space-archive-reader';
import { SpaceArchiveWriter } from './space-archive-writer';

describe('SpaceArchive', () => {
  describe('SpaceArchiveWriter', () => {
    test('writes and reads documents', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:test123');
        await writer.writeDocument('doc1', new Uint8Array([1, 2, 3]));
        await writer.writeDocument('doc2', new Uint8Array([4, 5, 6]));

        const archive = await writer.finish();

        expect(archive.filename).toContain(spaceId);
        expect(archive.contents).toBeInstanceOf(Uint8Array);

        const extracted = await extractSpaceArchive(archive);
        expect(extracted.metadata.version).toBe(SpaceArchiveVersion.V1);
        expect(extracted.metadata.originalSpaceId).toBe(spaceId);
        expect(extracted.metadata.echo?.currentRootUrl).toBe('automerge:test123');
        expect(extracted.documents['doc1' as DocumentId]).toEqual(new Uint8Array([1, 2, 3]));
        expect(extracted.documents['doc2' as DocumentId]).toEqual(new Uint8Array([4, 5, 6]));
      } finally {
        await writer.close();
      }
    });
  });

  describe('Feed Archive', () => {
    test('writes and reads a single feed with blocks', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        const blocks: FeedArchiveBlock[] = [
          {
            actorId: 'actor1',
            sequence: 0,
            prevActorId: null,
            prevSequence: null,
            position: 0,
            timestamp: 1000,
            data: btoa('block0'),
          },
          {
            actorId: 'actor1',
            sequence: 1,
            prevActorId: 'actor1',
            prevSequence: 0,
            position: 1,
            timestamp: 2000,
            data: btoa('block1'),
          },
        ];

        await writer.writeFeed('feed-123', 'data', blocks);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        expect(Object.keys(extracted.feeds)).toHaveLength(1);
        expect(extracted.feeds['feed-123']).toBeDefined();
        expect(extracted.feeds['feed-123'].metadata.id).toBe('feed-123');
        expect(extracted.feeds['feed-123'].metadata.namespace).toBe('data');
        expect(extracted.feeds['feed-123'].blocks).toHaveLength(2);
        expect(extracted.feeds['feed-123'].blocks[0].actorId).toBe('actor1');
        expect(extracted.feeds['feed-123'].blocks[0].sequence).toBe(0);
        expect(extracted.feeds['feed-123'].blocks[1].sequence).toBe(1);
      } finally {
        await writer.close();
      }
    });

    test('writes and reads multiple feeds', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        const dataBlocks: FeedArchiveBlock[] = [
          {
            actorId: 'actor1',
            sequence: 0,
            prevActorId: null,
            prevSequence: null,
            position: 0,
            timestamp: 1000,
            data: btoa('data-block'),
          },
        ];

        const traceBlocks: FeedArchiveBlock[] = [
          {
            actorId: 'actor2',
            sequence: 0,
            prevActorId: null,
            prevSequence: null,
            position: 0,
            timestamp: 2000,
            data: btoa('trace-block'),
          },
        ];

        await writer.writeFeed('feed-data', 'data', dataBlocks);
        await writer.writeFeed('feed-trace', 'trace', traceBlocks);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        expect(Object.keys(extracted.feeds)).toHaveLength(2);
        expect(extracted.feeds['feed-data'].metadata.namespace).toBe('data');
        expect(extracted.feeds['feed-trace'].metadata.namespace).toBe('trace');
      } finally {
        await writer.close();
      }
    });

    test('writes blocks in chunks when exceeding chunk size', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        const numBlocks = FEED_ARCHIVE_BLOCKS_PER_CHUNK + 50;
        const blocks: FeedArchiveBlock[] = [];
        for (let i = 0; i < numBlocks; i++) {
          blocks.push({
            actorId: 'actor1',
            sequence: i,
            prevActorId: i > 0 ? 'actor1' : null,
            prevSequence: i > 0 ? i - 1 : null,
            position: i,
            timestamp: 1000 + i,
            data: btoa(`block-${i}`),
          });
        }

        await writer.writeFeed('large-feed', 'data', blocks);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        expect(extracted.feeds['large-feed'].blocks).toHaveLength(numBlocks);
        expect(extracted.feeds['large-feed'].blocks[0].sequence).toBe(0);
        expect(extracted.feeds['large-feed'].blocks[numBlocks - 1].sequence).toBe(numBlocks - 1);
      } finally {
        await writer.close();
      }
    });

    test('handles empty feeds', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        await writer.writeFeed('empty-feed', 'data', []);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        expect(extracted.feeds['empty-feed']).toBeDefined();
        expect(extracted.feeds['empty-feed'].metadata.id).toBe('empty-feed');
        expect(extracted.feeds['empty-feed'].blocks).toHaveLength(0);
      } finally {
        await writer.close();
      }
    });

    test('preserves block data encoding', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        const originalData = new Uint8Array([0, 1, 2, 255, 128, 64]);
        const base64Data = btoa(String.fromCharCode(...originalData));

        const blocks: FeedArchiveBlock[] = [
          {
            actorId: 'actor1',
            sequence: 0,
            prevActorId: null,
            prevSequence: null,
            position: null,
            timestamp: 1000,
            data: base64Data,
          },
        ];

        await writer.writeFeed('binary-feed', 'data', blocks);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        const extractedData = extracted.feeds['binary-feed'].blocks[0].data;
        expect(extractedData).toBe(base64Data);

        const decoded = new Uint8Array(
          atob(extractedData)
            .split('')
            .map((char) => char.charCodeAt(0)),
        );
        expect(decoded).toEqual(originalData);
      } finally {
        await writer.close();
      }
    });

    test('combines documents and feeds in archive', async () => {
      const writer = new SpaceArchiveWriter();
      await writer.open();
      try {
        const spaceId = SpaceId.random();
        await writer.begin({ spaceId });
        await writer.setCurrentRootUrl('automerge:root');

        await writer.writeDocument('doc1', new Uint8Array([1, 2, 3]));
        await writer.writeFeed('feed1', 'data', [
          {
            actorId: 'actor1',
            sequence: 0,
            prevActorId: null,
            prevSequence: null,
            position: 0,
            timestamp: 1000,
            data: btoa('test'),
          },
        ]);

        const archive = await writer.finish();
        const extracted = await extractSpaceArchive(archive);

        expect(Object.keys(extracted.documents)).toHaveLength(1);
        expect(Object.keys(extracted.feeds)).toHaveLength(1);
        expect(extracted.documents['doc1' as DocumentId]).toEqual(new Uint8Array([1, 2, 3]));
        expect(extracted.feeds['feed1'].blocks).toHaveLength(1);
      } finally {
        await writer.close();
      }
    });
  });

  describe('File Structure', () => {
    test('file structure constants are correct', () => {
      expect(SpaceArchiveFileStructure.metadata).toBe('metadata.json');
      expect(SpaceArchiveFileStructure.documents).toBe('documents');
      expect(SpaceArchiveFileStructure.feeds).toBe('feeds');
      expect(SpaceArchiveFileStructure.feedMetadata).toBe('metadata.json');
      expect(SpaceArchiveFileStructure.feedBlocksPrefix).toBe('blocks-');
    });

    test('blocks per chunk constant is set', () => {
      expect(FEED_ARCHIVE_BLOCKS_PER_CHUNK).toBe(100);
    });
  });
});
