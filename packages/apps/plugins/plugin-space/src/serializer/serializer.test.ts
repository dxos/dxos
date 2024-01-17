//
// Copyright 2024 DXOS.org
//
import { Document } from '@braneframe/types';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { TextObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { Serializer } from './serializer';

describe('Serializer', () => {
  test('Serialize/deserialize space', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());

    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());

    const space = await client.spaces.create({ name: 'test' });
    await space.waitUntilReady();
    space.db.add(new Document({ content: new TextObject('') }));
    await space.db.flush();

    const serializer = new Serializer();
    const serialized = await serializer.serializeSpace(space);
    log.info('serialized', { serialized });
  });
});
