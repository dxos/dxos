//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { objectPointerCodec } from '@dxos/protocols';

import { IndexText } from './index-text';

const spaceKey = PublicKey.random();

describe('IndexText', () => {
  test('basic text search', async () => {
    const index = new IndexText();
    await index.open();

    // Add some test documents
    const docs = [
      {
        id: 'doc1',
        content: 'The quick brown fox jumps over the lazy dog',
      },
      {
        id: 'doc2',
        content: 'A fast orange fox leaps across a sleepy canine',
      },
      {
        id: 'doc3',
        content: 'The weather is sunny today',
      },
    ];

    for (const doc of docs) {
      await index.update(
        objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: doc.id, objectId: doc.id }),
        {
          data: {
            content: doc.content,
          },
        },
      );
    }

    // Search for something similar to the first document
    const results = await index.find({
      text: { query: 'quick fox', kind: 'text' },
      typenames: [],
    });

    // Should find the first document as it contains the exact words
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBeDefined();
    expect(results[0].rank).toBeGreaterThan(0);
  });

  test('serialization', async () => {
    const index = new IndexText();
    await index.open();

    // Add a test document
    const doc = {
      id: 'doc1',
      content: 'The quick brown fox jumps over the lazy dog',
    };

    await index.update(
      objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: doc.id, objectId: doc.id }),
      {
        data: {
          content: doc.content,
        },
      },
    );

    // Serialize and deserialize
    const serialized = await index.serialize();
    const index2 = await IndexText.load({ serialized, identifier: index.identifier, indexKind: index.kind });

    // Search should still work
    const results = await index2.find({
      text: { query: 'quick fox', kind: 'text' },
      typenames: [],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBeDefined();
    expect(results[0].rank).toBeGreaterThan(0);
  });

  test('remove document', async () => {
    const index = new IndexText();
    await index.open();

    const doc = {
      id: 'doc1',
      content: 'The quick brown fox jumps over the lazy dog',
    };

    const docId = objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: doc.id, objectId: doc.id });
    await index.update(docId, {
      data: {
        content: doc.content,
      },
    });

    // Verify document exists
    let results = await index.find({
      text: { query: 'quick fox', kind: 'text' },
      typenames: [],
    });
    expect(results.length).toBeGreaterThan(0);

    // Remove document
    await index.remove(docId);

    // Verify document is gone
    results = await index.find({
      text: { query: 'quick fox', kind: 'text' },
      typenames: [],
    });
    expect(results.length).toBe(0);
  });

  test('document with no content', async () => {
    const index = new IndexText();
    await index.open();

    const doc = {
      id: 'doc1',
      content: 123,
    };

    await index.update(
      objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: doc.id, objectId: doc.id }),
      {
        data: {
          content: doc.content,
        },
      },
    );

    const results = await index.find({
      text: { query: 'quick fox', kind: 'text' },
      typenames: [],
    });

    expect(results.length).toBe(0);
  });

  test('update document', async () => {
    const index = new IndexText();
    await index.open();

    const doc = {
      id: 'doc1',
      content: 'The quick brown fox jumps over the lazy dog',
    };

    const docId = objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: doc.id, objectId: doc.id });
    await index.update(docId, {
      data: {
        content: doc.content,
      },
    });

    doc.content = 'red fox';
    await index.update(docId, {
      data: {
        content: doc.content,
      },
    });

    const results = await index.find({
      text: { query: 'red fox', kind: 'text' },
      typenames: [],
    });

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(docId);
    expect(results[0].rank).toBeGreaterThan(0);
  });
});
