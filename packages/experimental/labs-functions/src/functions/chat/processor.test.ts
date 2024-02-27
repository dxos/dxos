//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Chain as ChainType, Message as MessageType, Thread as ThreadType } from '@braneframe/types';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { createSpaceObjectGenerator } from '@dxos/echo-generator';
import { TextObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { afterTest, describe, test } from '@dxos/test';

import { RequestProcessor } from './processor';
import { type ChainResources, type ChainVariant, createChainResources } from '../../chain';
import { getConfig, getKey } from '../../util';

// TODO(burdon): Factor out.
class TestProcessorBuilder {
  private readonly _ctx = new Context();

  private _client?: Client;
  private _space?: Space;
  private _resources?: ChainResources;

  async init() {
    const builder = new TestBuilder();
    const config = getConfig()!;

    this._client = new Client({ config, services: builder.createLocal() });
    await this._client.initialize();
    await this._client.halo.createIdentity();

    this._space = await this._client.spaces.create();

    this._resources = createChainResources((process.env.DX_AI_MODEL as ChainVariant) ?? 'openai', {
      baseDir: '/tmp/dxos/testing/agent/functions/embedding',
      apiKey: getKey(this._client.config, 'openai.com/api_key'),
    });

    this._ctx.onDispose(async () => {
      await this._client?.destroy();
      this._client = undefined;
    });

    return this;
  }

  async destroy() {
    await this._ctx.dispose();
  }

  get client(): Client {
    return this._client!;
  }

  get space(): Space {
    return this._space!;
  }

  get resources(): ChainResources {
    return this._resources!;
  }

  async addSchema() {
    invariant(this._space);
    const generator = createSpaceObjectGenerator(this._space);
    generator.addSchemas();
    await this._space.db.flush();
    return this;
  }
}

describe('RequestProcessor', () => {
  // TODO(burdon): Create test prompt.
  test('translate', async () => {
    const builder = new TestProcessorBuilder();
    await builder.init();
    afterTest(async () => {
      await builder.destroy(); // TODO(burdon): Hangs.
    });

    const { space, resources } = builder;

    // Add prompts.
    {
      space.db.add(
        new ChainType({
          prompts: [
            new ChainType.Prompt({
              command: 'translate',
              source: new TextObject(['Translate the following into {language}:', '---', '{input}'].join('\n')),
              inputs: [
                new ChainType.Input({
                  name: 'language',
                  type: ChainType.Input.Type.VALUE,
                  value: 'japanese',
                }),
                new ChainType.Input({ name: 'input', type: ChainType.Input.Type.PASS_THROUGH }),
              ],
            }),
          ],
        }),
      );
    }

    {
      const thread = new ThreadType();
      const message = new MessageType({
        blocks: [
          {
            content: new TextObject('/translate hello world!'),
          },
        ],
      });

      const processor = new RequestProcessor(resources);
      const blocks = await processor.processThread(space, thread, message);
      expect(blocks).to.have.length(1);
    }
  });

  test.skip('schema', async () => {
    const builder = new TestProcessorBuilder();
    await builder.init();
    await builder.addSchema();
    afterTest(async () => {
      await builder.destroy();
    });

    const { space, resources } = builder;

    // Add prompts.
    {
      space.db.add(
        new ChainType({
          prompts: [
            new ChainType.Prompt({
              command: 'extract',
              source: new TextObject(
                [
                  'List all people and companies mentioned in the content section below.',
                  '',
                  'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
                  'Your entire response should be a map where the key is the type and the value is a single array of JSON objects conforming to the following types:',
                  '',
                  '{company}',
                  '{contact}',
                  '---',
                  'Content:',
                  '{input}',
                ].join('\n'),
              ),
              inputs: [
                //
                new ChainType.Input({ name: 'input', type: ChainType.Input.Type.PASS_THROUGH }),
                new ChainType.Input({
                  name: 'company',
                  type: ChainType.Input.Type.SCHEMA,
                  value: 'example.com/schema/organization',
                }),
                new ChainType.Input({
                  name: 'contact',
                  type: ChainType.Input.Type.SCHEMA,
                  value: 'example.com/schema/contact',
                }),
              ],
            }),
          ],
        }),
      );
    }

    {
      const text = [
        'Satya Narayana Nadella is an Indian-American business executive.',
        'He is the executive chairman and CEO of Microsoft, succeeding Steve Ballmer in 2014 as CEO and John W. Thompson in 2021 as chairman.',
        "Before becoming CEO, he was the executive vice president of Microsoft's cloud and enterprise group, responsible for building and running the company's computing platforms.",
        'Nadella worked at Sun Microsystems as a member of its technology staff before joining Microsoft in 1992.',
      ].join('\n');

      const thread = new ThreadType();
      const message = new MessageType({
        blocks: [
          {
            content: new TextObject(`/extract "${text}"`),
          },
        ],
      });

      const processor = new RequestProcessor(resources);
      const blocks = await processor.processThread(space, thread, message);
      expect(blocks).to.have.length(5);
    }
  });
});
