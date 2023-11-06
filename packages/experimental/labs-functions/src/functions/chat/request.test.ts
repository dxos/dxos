//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { afterTest, describe, test } from '@dxos/test';

import { RequestBuilder } from './request';

describe.skip('RequestBuilder', () => {
  test('basic', async () => {
    const builder = new TestBuilder();
    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
    afterTest(async () => {
      await client.destroy();
    });

    {
      const space = await client.spaces.create();
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      await space.db.flush();

      // console.log(client.experimental.types);

      const builder = new RequestBuilder(client);

      builder.setContext(generator.getSchema('example.com/schema/project')!);

      console.log(JSON.stringify(builder.build(), null, 2));
    }
  });
});
