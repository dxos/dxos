//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Document, Folder } from '@braneframe/types';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { TextObject, setGlobalAutomergePreference } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { FileSerializer } from './file-serializer';

const createSpace = async (client: Client, name: string | undefined = undefined) => {
  const space = await client.spaces.create(name ? { name } : undefined);
  await space.waitUntilReady();
  const folder = new Folder();
  space.properties[Folder.schema.typename] = folder;
  await space.db.flush();

  return space;
};

describe('FileSerializer', () => {
  test('Serialize/deserialize space', async () => {
    setGlobalAutomergePreference(true);
    afterTest(() => setGlobalAutomergePreference(false));
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();

    const space = await createSpace(client, 'test');
    const text = 'Hello world!';
    space.properties[Folder.schema.typename].objects.push(new Document({ content: new TextObject(text) }));

    const serializer = new FileSerializer();
    const serialized = await serializer.serializeSpace(space);

    const newSpace = await createSpace(client, 'deserialized space');
    const deserialized = await serializer.deserializeSpace(newSpace, serialized);
    const deserializedDocument = deserialized.properties[Folder.schema.typename].objects[0];
    expect(deserializedDocument instanceof Document).to.be.true;
    expect(deserializedDocument.content.content).to.equal(text);
  });
});
