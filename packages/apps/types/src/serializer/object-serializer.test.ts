//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import * as E from '@dxos/echo-schema';
import { getTextContent } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { ObjectSerializer, type SerializedSpace } from './object-serializer';
import { getSpaceProperty, setSpaceProperty } from './space-properties';
import { DocumentType, FolderType, TextV0Type } from '../schema';

const createSpace = async (client: Client, name: string | undefined = undefined) => {
  const space = await client.spaces.create(name ? { name } : undefined);
  await space.waitUntilReady();
  setSpaceProperty(space, FolderType.typename, E.object(FolderType, { objects: [] }));
  await space.db.flush();
  return space;
};

describe('Serialization', () => {
  test('serialize/deserialize space', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocal() });
    client._graph.types.registerEffectSchema(FolderType, DocumentType);
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();

    const serializer = new ObjectSerializer();
    const content = ['# Hello world!', '', 'This is a document.'].join('\n');

    let serialized: SerializedSpace;
    {
      const space1 = await createSpace(client, 'test-1');
      const { objects } = getSpaceProperty<FolderType>(space1, FolderType.typename)!;
      objects.push(E.object(DocumentType, { content: E.object(TextV0Type, { content }) }));

      serialized = await serializer.serializeSpace(space1);
      expect(serialized.metadata.name).to.equal('test-1');
      expect(serialized.objects).to.have.length(1);
      // console.log(serialized);
    }

    {
      const space2 = await createSpace(client, 'test-2');
      const space3 = await serializer.deserializeSpace(space2, serialized);
      const { objects } = getSpaceProperty<FolderType>(space3, FolderType.typename)!;

      const object = objects[0]!;
      expect(object instanceof DocumentType).to.be.true;
      expect(getTextContent(object.content)).to.equal(content);

      // TODO(burdon): Object ID is not preserved (refs?)
      expect(object.id).to.not.equal(serialized.objects[0].id);
    }
  });

  // TODO(burdon): Test folders.
  // TODO(burdon): Test filename collisions.
  // TODO(burdon): Test different serializers.
});
