//
// Copyright 2023 DXOS.org
//

import { onTestFinished, describe, expect, test } from 'vitest';

import { create, makeRef } from '@dxos/live-object';
import { TemplateInputType, TemplateType } from '@dxos/plugin-automation/types';
import { MessageType, ThreadType } from '@dxos/plugin-space/types';

import { RequestProcessor } from './processor';
import { TestProcessorBuilder, StubModelInvoker } from './testing';
import { str } from '../../util';

describe('RequestProcessor', () => {
  // TODO(burdon): Create test prompt.
  test('translate', async () => {
    const builder = new TestProcessorBuilder();
    await builder.init();
    onTestFinished(async () => {
      await builder.destroy(); // TODO(burdon): Hangs.
    });

    const { space, resources } = builder;

    // Add prompts.
    const command = 'translate';
    const template = str('Translate the following into {language}:', '---', '{input}');
    const language = 'japanese';
    {
      space.db.add(
        create(TemplateType, {
          prompts: [
            makeRef(
              create(TemplateType, {
                command,
                template,
                inputs: [
                  {
                    type: TemplateInputType.VALUE,
                    name: 'language',
                    value: language,
                  },
                  {
                    type: TemplateInputType.PASS_THROUGH,
                    name: 'input',
                  },
                ],
              }),
            ),
          ],
        }),
      );
    }

    const input = 'hello world';
    {
      const thread = create(ThreadType, { messages: [] });
      const message = create(MessageType, {
        sender: {},
        timestamp: new Date().toISOString(),
        text: `/${command} ${input}`,
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
    onTestFinished(async () => {
      await builder.destroy();
    });

    const { space, resources } = builder;

    // Add prompts.
    {
      space.db.add(
        create(TemplateType, {
          prompts: [
            makeRef(
              create(TemplateType, {
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
                    type: TemplateInputType.PASS_THROUGH,
                    name: 'input',
                  },
                  {
                    type: TemplateInputType.SCHEMA,
                    name: 'company',
                    value: 'example.com/type/organization',
                  },
                  {
                    type: TemplateInputType.SCHEMA,
                    name: 'contact',
                    value: 'example.com/type/contact',
                  },
                ],
              }),
            ),
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
        sender: {},
        timestamp: new Date().toISOString(),
        text: `/extract "${text}"`,
      });

      const processor = new RequestProcessor(new StubModelInvoker(), resources);
      const blocks = await processor.processThread({ space, thread, message });
      expect(blocks).to.have.length(5);
    }
  });
});
