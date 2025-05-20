import { describe, expect, test } from 'vitest';
import { IndexGraph } from './index-graph';
import { TestData } from '../testing';
import { objectPointerCodec, ObjectPointerEncoded } from '@dxos/protocols';
import { log } from '@dxos/log';
import { DXN, PublicKey } from '@dxos/keys';
import type { FindResult } from '../types';
import type { ObjectId } from '@dxos/echo-schema';
import { encodeReference, Reference } from '@dxos/echo-protocol';

const spaceKey = PublicKey.random();

describe('IndexGraph', () => {
  test('query all', async () => {
    const index = new IndexGraph();
    await index.open();
    for (const { id, doc } of TestData.OBJECTS) {
      await index.update(encodeObjectPointer(id), doc);
    }

    // log.info('index', {
    //   index: JSON.parse(await index.serialize()),
    //   testData: TestData.OBJECTS,
    // });

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
          anchors: [TestData.ORGS.cyberdyne.id],
        },
        typenames: [],
      });
      assertResult(result, [
        TestData.WORKS_FOR.johnAtCyberdyne.id,
        TestData.WORKS_FOR.sarahAtCyberdyne.id,
        TestData.WORKS_FOR.emmaAtCyberdyne.id,
      ]);
    }
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
});

const assertResult = (result: FindResult[], expected: ObjectId[]) => {
  expect(result.map((r) => objectPointerCodec.decode(r.id).objectId).sort()).toEqual(expected.sort());
};

const encodeObjectPointer = (id: ObjectId) =>
  objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: id, objectId: id });
