//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { ChainInputType, ChainPromptType, ChainType, MessageType, TextV0Type, ThreadType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { afterTest, describe, test } from '@dxos/test';

import { RequestProcessor } from './processor';
import { TestProcessorBuilder } from './testing';
import { StubModelInvoker } from '../../tests/stub-invoker';
import { str } from '../../util';

describe.only('RequestProcessor', () => {
  // TODO(burdon): Create test prompt.
  test('translate', async () => {
    const builder = new TestProcessorBuilder();
    await builder.init();
    afterTest(async () => {
      await builder.destroy(); // TODO(burdon): Hangs.
    });

    const { space, resources } = builder;

    // Add prompts.
    const command = 'translate';
    const template = str('Translate the following into {language}:', '---', '{input}');
    const language = 'japanese';
    {
      space.db.add(
        create(ChainType, {
          prompts: [
            create(ChainPromptType, {
              command,
              template,
              inputs: [
                {
                  type: ChainInputType.VALUE,
                  name: 'language',
                  value: language,
                },
                {
                  type: ChainInputType.PASS_THROUGH,
                  name: 'input',
                },
              ],
            }),
          ],
        }),
      );
    }

    const input = 'hello world';
    {
      const thread = create(ThreadType, { messages: [] });
      const message = create(MessageType, {
        from: {},
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content: create(TextV0Type, { content: `/${command} ${input}` }),
          },
        ],
      });

      const testInvoker = new StubModelInvoker();
      const processor = new RequestProcessor(testInvoker, resources);
      await processor.processThread({ space, thread, message });
      expect(testInvoker.lastCallArguments).to.deep.contain({
        sequenceInput: input,
        template,
        templateSubstitutions: { language, input },
      });
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
        create(ChainType, {
          prompts: [
            create(ChainPromptType, {
              command: 'extract',
              template: str(
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
              ),
              inputs: [
                {
                  type: ChainInputType.PASS_THROUGH,
                  name: 'input',
                },
                {
                  type: ChainInputType.SCHEMA,
                  name: 'company',
                  value: 'example.com/type/organization',
                },
                {
                  type: ChainInputType.SCHEMA,
                  name: 'contact',
                  value: 'example.com/type/contact',
                },
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

      const thread = create(ThreadType, { messages: [] });
      const message = create(MessageType, {
        from: {},
        blocks: [
          {
            timestamp: new Date().toISOString(),
            content: create(TextV0Type, { content: `/extract "${text}"` }),
          },
        ],
      });

      const processor = new RequestProcessor(new StubModelInvoker(), resources);
      const blocks = await processor.processThread({ space, thread, message });
      expect(blocks).to.have.length(5);
    }
  });
});
