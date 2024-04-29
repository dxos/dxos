//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { encodeReference, type ObjectStructure } from '@dxos/echo-pipeline';
import { Reference } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { IndexSchema } from './index-schema';

describe('IndexSchema', () => {
  const schemaURI = '@example.org/schema/Contact';
  const objects: Partial<ObjectStructure>[] = [
    {
      data: {
        name: 'John',
      },
      // Complaint structure with automerge storage
      system: {
        type: encodeReference(new Reference(schemaURI)),
      },
    },
    {
      data: {
        title: 'first document',
      },
      system: {
        type: encodeReference(new Reference('@example.org/schema/Document')),
      },
    },
  ];

  test('basic', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    await Promise.all(objects.map((object, id) => index.update(String(id), object)));

    const ids = await index.find({ typename: schemaURI });
    expect(ids.length).to.equal(1);
    expect(ids[0].id).to.equal('0');
  });

  test('update', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    await Promise.all(objects.map((object, id) => index.update(String(id), object)));

    {
      const ids = await index.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }

    {
      const updated = await index.update('0', objects[0]);
      expect(updated).to.be.false;
    }

    {
      const updated = await index.update('0', {});
      expect(updated).to.be.true;
      const ids = await index.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });

  test('remove', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    await Promise.all(objects.map((object, id) => index.update(String(id), object)));

    {
      const ids = await index.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }

    await index.remove('0');

    {
      const ids = await index.find({ typename: schemaURI });
      expect(ids.length).to.equal(0);
    }
  });

  test('serialize/load', async () => {
    const index = new IndexSchema();
    await index.open();
    afterTest(() => index.close());

    await Promise.all(objects.map((object, id) => index.update(String(id), object)));

    const serialized = await index.serialize();

    const loadedIndex = await IndexSchema.load({ serialized, identifier: index.identifier, indexKind: index.kind });

    {
      const ids = await loadedIndex.find({ typename: schemaURI });
      expect(ids.length).to.equal(1);
      expect(ids[0].id).to.equal('0');
    }
  });
});
