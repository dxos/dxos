//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Reference, encodeReference } from '@dxos/echo-protocol';
import { DXN, type ObjectId, PublicKey } from '@dxos/keys';
import { objectPointerCodec } from '@dxos/protocols';

import { TestData } from '../testing';
import type { FindResult } from '../types';

import { IndexGraph } from './index-graph';

const spaceKey = PublicKey.random();

describe('IndexGraph', () => {
  test('query all', async () => {
    const index = new IndexGraph();
    await index.open();
    for (const { id, doc } of TestData.OBJECTS) {
      await index.update(encodeObjectPointer(id), doc);
    }

    await assertInitialStateQueries(index);
  });

  test('index updates', async () => {
    const index = new IndexGraph();
    await index.open();

    for (const { id, doc } of TestData.OBJECTS) {
      await index.update(objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: id, objectId: id }), doc);
    }

    // Re-assign task1 to Sarah
    await index.update(encodeObjectPointer(TestData.TASKS.task1.id), {
      ...TestData.TASKS.task1.doc,
      data: {
        ...TestData.TASKS.task1.doc.data,
        assignedTo: encodeReference(Reference.fromDXN(DXN.fromLocalObjectId(TestData.CONTACTS.sarah.id))),
      },
    });

    {
      const result = await index.find({
        graph: {
          kind: 'inbound-reference',
          anchors: [TestData.CONTACTS.sarah.id],
          property: 'assignedTo',
        },
        typenames: [],
      });
      assertResult(result, [TestData.TASKS.task1.id, TestData.TASKS.task2.id]);
    }

    {
      const result = await index.find({
        graph: {
          kind: 'inbound-reference',
          anchors: [TestData.CONTACTS.john.id],
          property: 'assignedTo',
        },
        typenames: [],
      });
      assertResult(result, []);
    }
  });

  test('serialization', async () => {
    const index = new IndexGraph();
    await index.open();
    for (const { id, doc } of TestData.OBJECTS) {
      await index.update(encodeObjectPointer(id), doc);
    }

    const serialized = await index.serialize();
    const index2 = await IndexGraph.load({ serialized, identifier: index.identifier, indexKind: index.kind });
    await index2.open();
    await assertInitialStateQueries(index2);
  });
});

const assertResult = (result: FindResult[], expected: ObjectId[]) => {
  expect(result.map((r) => objectPointerCodec.decode(r.id).objectId).sort()).toEqual(expected.sort());
};

const encodeObjectPointer = (id: ObjectId) =>
  objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: id, objectId: id });

// Expectations for the initial state of the index based on the test data.
const assertInitialStateQueries = async (index: IndexGraph) => {
  {
    const result = await index.find({
      graph: {
        kind: 'inbound-reference',
        anchors: [TestData.ARTICLES.marineLife.id],
        property: 'objects',
      },
      typenames: [],
    });
    assertResult(result, [TestData.COLLECTIONS.articles.id]);
  }

  {
    const result = await index.find({
      graph: {
        kind: 'inbound-reference',
        anchors: [TestData.CONTACTS.john.id],
        property: 'assignedTo',
      },
      typenames: [],
    });
    assertResult(result, [TestData.TASKS.task1.id]);
  }

  {
    const result = await index.find({
      graph: {
        kind: 'relation-source',
        property: null,
        anchors: [TestData.CONTACTS.sarah.id],
      },
      typenames: [],
    });
    assertResult(result, [TestData.WORKS_FOR.sarahAtCyberdyne.id]);
  }

  {
    const result = await index.find({
      graph: {
        kind: 'relation-target',
        property: null,
        anchors: [TestData.ORGANIZATIONS.cyberdyne.id],
      },
      typenames: [],
    });
    assertResult(result, [
      TestData.WORKS_FOR.johnAtCyberdyne.id,
      TestData.WORKS_FOR.sarahAtCyberdyne.id,
      TestData.WORKS_FOR.emmaAtCyberdyne.id,
    ]);
  }
};
