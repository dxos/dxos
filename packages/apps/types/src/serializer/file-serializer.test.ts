//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import * as E from '@dxos/echo-schema';
import { getTextContent } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { FileSerializer, type SerializedSpace } from './file-serializer';
import { getSpaceProperty, setSpaceProperty } from './space-properties';
import { DocumentType, FolderType, TextV0Type } from '../schema';

const createSpace = async (client: Client, name: string | undefined = undefined) => {
  const space = await client.spaces.create(name ? { name } : undefined);
  await space.waitUntilReady();
  setSpaceProperty(space, FolderType.typename, E.object(FolderType, { objects: [] }));
  await space.db.flush();
  return space;
};

// TODO(wittjosiah): Fix test.
describe('FileSerializer', () => {
  test.skip('Serialize/deserialize space', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();

    const serializer = new FileSerializer();

    const text = 'Hello world!';
    let serialized: SerializedSpace;
    {
      const space1 = await createSpace(client, 'test-1');
      getSpaceProperty<FolderType>(space1, FolderType.typename)!.objects.push(
        E.object(DocumentType, { content: E.object(TextV0Type, { content: text }) }),
      );
      serialized = await serializer.serializeSpace(space1);
    }

    {
      const space2 = await createSpace(client, 'test-2');
      const space3 = await serializer.deserializeSpace(space2, serialized);

      const object = getSpaceProperty<FolderType>(space3, FolderType.typename)!.objects[0];
      expect(object instanceof DocumentType).to.be.true;

      const content = getTextContent(object?.content);
      expect(content).to.equal(text);
    }
  });
});
