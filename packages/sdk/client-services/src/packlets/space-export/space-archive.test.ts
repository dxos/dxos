//
// Copyright 2025 DXOS.org
//

import type { DocumentId } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { type SerializedSpace } from '@dxos/echo-db';
import { ObjectId, SpaceId } from '@dxos/keys';
import {
  FEED_ARCHIVE_BLOCKS_PER_CHUNK,
  type FeedArchiveBlock,
  SpaceArchiveFileStructure,
  SpaceArchiveVersion,
} from '@dxos/protocols';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import { detectSpaceArchiveFormat } from './archive-format';
import { buildDatabaseDirectoryFromObjects, readSerializedSpaceArchive } from './serialized-space-reader';
import { objectStructureToObjJson, orderObjJsonFields } from './serialized-space-writer';
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

  describe('detectSpaceArchiveFormat', () => {
    test('detects JSON via .dx.json extension', () => {
      const format = detectSpaceArchiveFormat({ filename: 'space.dx.json', contents: new Uint8Array() });
      expect(format).toBe(SpaceArchive.Format.JSON);
    });

    test('detects JSON via .json extension', () => {
      const format = detectSpaceArchiveFormat({ filename: 'backup.json', contents: new Uint8Array() });
      expect(format).toBe(SpaceArchive.Format.JSON);
    });

    test('detects BINARY via .tar extension', () => {
      const format = detectSpaceArchiveFormat({ filename: 'space.tar', contents: new Uint8Array() });
      expect(format).toBe(SpaceArchive.Format.BINARY);
    });

    test('detects BINARY via .tar.gz extension', () => {
      const format = detectSpaceArchiveFormat({ filename: 'space.tar.gz', contents: new Uint8Array() });
      expect(format).toBe(SpaceArchive.Format.BINARY);
    });

    test('falls back to JSON via leading { byte', () => {
      const contents = new TextEncoder().encode('{"version":1}');
      const format = detectSpaceArchiveFormat({ filename: 'unknown', contents });
      expect(format).toBe(SpaceArchive.Format.JSON);
    });

    test('skips leading whitespace before sniffing', () => {
      const contents = new TextEncoder().encode('  \n\t{"version":1}');
      const format = detectSpaceArchiveFormat({ filename: 'unknown', contents });
      expect(format).toBe(SpaceArchive.Format.JSON);
    });

    test('falls back to BINARY on non-JSON bytes', () => {
      const format = detectSpaceArchiveFormat({
        filename: 'unknown',
        contents: new Uint8Array([0x00, 0x01, 0x02]),
      });
      expect(format).toBe(SpaceArchive.Format.BINARY);
    });
  });

  describe('SerializedSpace reader', () => {
    test('parses a minimal JSON archive', () => {
      const serialized: SerializedSpace = {
        version: 1,
        objects: [],
      };
      const contents = new TextEncoder().encode(JSON.stringify(serialized));
      const archive: SpaceArchive = {
        filename: 'test.dx.json',
        contents,
        format: SpaceArchive.Format.JSON,
      };
      const result = readSerializedSpaceArchive(archive);
      expect(result.version).toBe(1);
      expect(result.objects).toEqual([]);
    });

    test('rejects archives missing required fields', () => {
      const bogus = new TextEncoder().encode(JSON.stringify({ objects: [] }));
      expect(() =>
        readSerializedSpaceArchive({
          filename: 'bad.json',
          contents: bogus,
          format: SpaceArchive.Format.JSON,
        }),
      ).toThrow();
    });

    test('buildDatabaseDirectoryFromObjects round-trips data and type info', () => {
      const id = ObjectId.random();
      const objects = [
        {
          id,
          '@type': 'dxn:type:example.Thing',
          '@meta': { keys: [] },
          title: 'hello',
        },
      ];
      const directory = buildDatabaseDirectoryFromObjects(objects as any);
      expect(directory.objects).toBeDefined();
      const structure = directory.objects![id];
      expect(structure).toBeDefined();
      expect(structure.data).toEqual({ title: 'hello' });
      expect(structure.system?.type).toEqual({ '/': 'dxn:type:example.Thing' });
      expect(structure.system?.kind).toBe('object');
    });

    test('objectStructureToObjJson emits fields in canonical order', () => {
      const id = ObjectId.random();
      const sourceId = ObjectId.random();
      const targetId = ObjectId.random();
      const parentId = ObjectId.random();
      const obj = objectStructureToObjJson(id, {
        data: { title: 'hello', count: 42 },
        meta: { keys: [] },
        system: {
          type: { '/': 'dxn:type:example.Link' },
          kind: 'relation',
          source: { '/': sourceId },
          target: { '/': targetId },
          parent: { '/': parentId },
          deleted: true,
        },
      });

      expect(Object.keys(obj)).toEqual([
        'id',
        '@type',
        '@meta',
        '@deleted',
        '@parent',
        '@relationSource',
        '@relationTarget',
        'title',
        'count',
      ]);
    });

    test('orderObjJsonFields reorders feed queue messages with id/@type/@meta first', () => {
      const id = ObjectId.random();
      const message = {
        payload: { value: 'x' },
        timestamp: 1000,
        id,
        '@meta': { keys: [] },
        '@type': 'dxn:type:example.Message',
      } as any;

      const ordered = orderObjJsonFields(message);
      expect(Object.keys(ordered)).toEqual(['id', '@type', '@meta', 'payload', 'timestamp']);
      expect(ordered).toEqual(message);
    });

    test('orderObjJsonFields preserves unknown @-prefixed fields between system and data', () => {
      const id = ObjectId.random();
      const obj = {
        data: 1,
        '@custom': 'extension',
        '@type': 'dxn:type:example.Thing',
        id,
      } as any;

      const ordered = orderObjJsonFields(obj);
      expect(Object.keys(ordered)).toEqual(['id', '@type', '@custom', 'data']);
    });

    test('buildDatabaseDirectoryFromObjects flags relations', () => {
      const id = ObjectId.random();
      const sourceId = ObjectId.random();
      const targetId = ObjectId.random();
      const objects = [
        {
          id,
          '@type': 'dxn:type:example.Link',
          '@meta': { keys: [] },
          '@relationSource': sourceId,
          '@relationTarget': targetId,
        },
      ];
      const directory = buildDatabaseDirectoryFromObjects(objects as any);
      const structure = directory.objects![id];
      expect(structure.system?.kind).toBe('relation');
      expect(structure.system?.source).toEqual({ '/': sourceId });
      expect(structure.system?.target).toEqual({ '/': targetId });
    });
  });
});
