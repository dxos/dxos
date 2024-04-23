//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { ObjectSerializer } from './object-serializer';
import { getSpaceProperty, setSpaceProperty } from './space-properties';
import { type SerializedSpace } from './types';
import { DocumentType, Collection, TextV0Type } from '../schema';

const createSpace = async (client: Client, name: string | undefined = undefined) => {
  const space = await client.spaces.create(name ? { name } : undefined);
  await space.waitUntilReady();
  setSpaceProperty(space, Collection.typename, create(Collection, { objects: [] }));
  await space.db.flush();
  return space;
};

describe('Serialization', () => {
  test('serialize/deserialize space', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocal() });
    client.addSchema(Collection, DocumentType, TextV0Type);
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();

    const serializer = new ObjectSerializer();
    const content = ['# Hello world!', '', 'This is a document.'].join('\n');

    let serialized: SerializedSpace;
    {
      const space1 = await createSpace(client, 'test-1');
      const { objects } = getSpaceProperty<Collection>(space1, Collection.typename)!;
      objects.push(create(DocumentType, { content: create(TextV0Type, { content }) }));

      serialized = await serializer.serializeSpace(space1);
      expect(serialized.metadata.name).to.equal('test-1');
      expect(serialized.objects).to.have.length(1);
      // console.log(serialized);
    }

    {
      const space2 = await createSpace(client, 'test-2');
      const space3 = await serializer.deserializeObjects(space2, serialized);
      const { objects } = getSpaceProperty<Collection>(space3, Collection.typename)!;

      const object = objects[0]!;
      expect(object instanceof DocumentType).to.be.true;
      expect(object.content.content).to.equal(content);
      expect(object.id).to.equal(serialized.objects[0].id);
    }
  });

  // TODO(burdon): Test folders.
  // TODO(burdon): Test filename collisions.
  // TODO(burdon): Test different serializers.
});
