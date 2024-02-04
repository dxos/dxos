//
// Copyright 2023 DXOS.org
//

import { Message as MessageType, Thread as ThreadType } from '@braneframe/types';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { afterTest, describe, test } from '@dxos/test';

import { RequestProcessor } from './processor';
import { type ChainVariant, createChainResources } from '../../chain';
import { getConfig, getKey } from '../../util';

describe('RequestBuilder', () => {
  test.only('basic', async () => {
    const builder = new TestBuilder();
    const config = getConfig()!;
    const client = new Client({ config, services: builder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
    afterTest(async () => {
      await client.destroy(); // TODO(burdon): Hangs.
    });

    const space = await client.spaces.create();

    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      await space.db.flush();
    }

    // TODO(burdon): Factor out.
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: '/tmp/dxos/testing/agent/functions/embedding',
      apiKey: getKey(client.config, 'openai.com/api_key'),
    });

    const processor = new RequestProcessor(resources);

    {
      const thread = new ThreadType();
      const message = new MessageType();

      const blocks = await processor.processThread(space, thread, message);
      console.log(blocks);

      // console.log(client.experimental.types);
      // const builder = new RequestBuilder(client);
      // builder.setContext(generator.getSchema(TestSchemaType.project)!);
      // console.log(JSON.stringify(builder.build(), null, 2));
    }
  });
});
