//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { create } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { ObjectSerializer } from './object-serializer';
import { type SerializedSpace } from './types';
import { DocumentType, CollectionType, TextType } from '../schema';

const createSpace = async (client: Client, name: string | undefined = undefined) => {
  const space = await client.spaces.create(name ? { name } : undefined);
  await space.waitUntilReady();
  space.properties[CollectionType.typename] = create(CollectionType, { objects: [], views: {} });
  await space.db.flush();
  return space;
};

describe('Serialization', () => {
  test('serialize/deserialize space', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocalClientServices() });
    await client.initialize();
    client.addTypes([CollectionType, DocumentType, TextType]);
    afterTest(() => client.destroy());
    await client.halo.createIdentity();

    const serializer = new ObjectSerializer();
    const content = ['# Hello world!', '', 'This is a document.'].join('\n');

    let serialized: SerializedSpace;
    {
      const space1 = await createSpace(client, 'test-1');
      const { objects } = space1.properties[CollectionType.typename] as CollectionType;
      objects.push(create(DocumentType, { content: create(TextType, { content }), threads: [] }));

      serialized = await serializer.serializeSpace(space1);
      expect(serialized.metadata.name).to.equal('test-1');
      expect(serialized.objects).to.have.length(1);
      // console.log(serialized);
    }

    {
      const space2 = await createSpace(client, 'test-2');
      const space3 = await serializer.deserializeObjects(space2, serialized);
      const { objects } = space3.properties[CollectionType.typename] as CollectionType;

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
