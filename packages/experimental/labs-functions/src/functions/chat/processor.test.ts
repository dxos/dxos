//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Chain as ChainType, Message as MessageType, Thread as ThreadType } from '@braneframe/types';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { TextObject } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { RequestProcessor } from './processor';
import { type ChainVariant, createChainResources } from '../../chain';
import { getConfig, getKey } from '../../util';

describe('RequestBuilder', () => {
  test.only('prompt', async () => {
    const builder = new TestBuilder();
    const config = getConfig()!;
    const client = new Client({ config, services: builder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity();
    afterTest(async () => {
      await client.destroy(); // TODO(burdon): Hangs.
    });

    // TODO(burdon): Factor out.
    const resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: '/tmp/dxos/testing/agent/functions/embedding',
      apiKey: getKey(client.config, 'openai.com/api_key'),
    });

    const space = await client.spaces.create();

    // Add schema.
    {
      const generator = createSpaceObjectGenerator(space);
      generator.addSchemas();
      await space.db.flush();
    }

    // Add prompts.
    {
      space.db.add(
        new ChainType({
          prompts: [
            new ChainType.Prompt({
              command: 'translate',
              source: new TextObject(
                [
                  //
                  'Translate the following into {language}:',
                  '',
                  '---',
                  '',
                  '{input}',
                ].join('\n'),
              ),
              inputs: [
                new ChainType.Input({
                  name: 'language',
                  type: ChainType.Input.Type.VALUE,
                  value: new TextObject('japanese'),
                }),
                new ChainType.Input({ name: 'input', type: ChainType.Input.Type.PASS_THROUGH }),
              ],
            }),
          ],
        }),
      );
    }

    const processor = new RequestProcessor(resources);

    {
      const thread = new ThreadType();
      const message = new MessageType({
        blocks: [
          {
            content: new TextObject('/translate hello'),
          },
        ],
      });

      const blocks = await processor.processThread(space, thread, message);
      expect(blocks).to.have.length(1);
    }
  });
});
