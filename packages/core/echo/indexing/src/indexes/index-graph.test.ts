import { describe, expect, test } from 'vitest';
import { IndexGraph } from './index-graph';
import { TestData } from '../testing';
import { objectPointerCodec, ObjectPointerEncoded } from '@dxos/protocols';
import { log } from '@dxos/log';
import { PublicKey } from '@dxos/keys';

const spaceKey = PublicKey.random();

describe('IndexGraph', () => {
  test('query all', async () => {
    const index = new IndexGraph();
    await index.open();

    for (const { id, doc } of TestData.OBJECTS) {
      await index.update(objectPointerCodec.encode({ spaceKey: spaceKey.toHex(), documentId: id, objectId: id }), doc);
    }

    log.info('index', {
      index: JSON.parse(await index.serialize()),
      testData: TestData.OBJECTS,
    });

    {
      const result = await index.find({
        graph: {
          kind: 'inbound-reference',
          anchors: [TestData.CONTACTS.john.id],
          property: 'assignedTo',
        },
        typenames: [],
      });
      expect(result.map((r) => objectPointerCodec.decode(r.id).objectId)).toEqual([TestData.TASKS.task1.id]);
    }
  });
});
