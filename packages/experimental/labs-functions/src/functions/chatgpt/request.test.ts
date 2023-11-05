//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { afterTest, describe, test } from '@dxos/test';

import { RequestBuilder } from './request';

describe('RequestBuilder', () => {
  test('basic', async () => {
    const builder = new TestBuilder();
    const client = new Client({ services: builder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    afterTest(() => builder.destroy());

    {
      const builder = new RequestBuilder(client);
      console.log(JSON.stringify(builder.build(), null, 2));
    }
  });
});
