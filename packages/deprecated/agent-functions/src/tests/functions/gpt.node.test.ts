//
// Copyright 2023 DXOS.org
//

import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';
import { getMeta, type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { FunctionDef, FunctionTrigger, TriggerKind } from '@dxos/functions';
import { createInitializedClients, inviteMember, startFunctionsHost } from '@dxos/functions/testing';
import { create, makeRef } from '@dxos/live-object';
import { TemplateInputType, TemplateType } from '@dxos/plugin-automation/types';
import { MessageType, ThreadType } from '@dxos/plugin-space/types';
import { TextType } from '@dxos/schema';

import { type ChainResources, ModelInvokerFactory } from '../../chain';
import { StubModelInvoker } from '../../functions/gpt/testing';
import { initFunctionsPlugin } from '../setup';
import { createTestChain, type CreateTestTemplateInput } from '../test-chain-builder';

// TODO(wittjosiah): Broken in vitest.
describe.skip('GPT', () => {
  let testBuilder: TestBuilder;
  let modelStub: StubModelInvoker;

  beforeEach(async () => {
    testBuilder = new TestBuilder();
    modelStub = new StubModelInvoker();
    ModelInvokerFactory.setFactory({
      createModelInvoker: () => modelStub,
      createChainResources: () => ({ init: async () => {} }) as any as ChainResources,
    });
  });

  afterEach(async () => {
    await testBuilder.destroy();
  });

  describe('inputs', () => {
    test('pass_through', async () => {
      const { space, functions, trigger } = await setupTest(testBuilder);
      const testChain: CreateTestTemplateInput = {
        template: 'example {input}',
        inputs: [{ type: TemplateInputType.PASS_THROUGH, name: 'input' }],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitForActiveTriggers(space);

      const message = 'hello';
      createMessage(space, message);
      await waitForCall(modelStub);
      expect(modelStub.calls[0]).to.deep.contain({
        template: testChain.template,
        sequenceInput: message,
        templateSubstitutions: { input: message },
      });
    });

    test('value', async () => {
      const { space, functions, trigger } = await setupTest(testBuilder);
      const value = '12345';
      const testChain: CreateTestTemplateInput = {
        template: 'example {input}',
        inputs: [{ type: TemplateInputType.VALUE, name: 'input', value }],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitForActiveTriggers(space);

      const message = 'hello';
      createMessage(space, message);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        template: testChain.template,
        sequenceInput: message,
        templateSubstitutions: { input: value },
      });
    });

    test('multiple inputs', async () => {
      const { space, functions, trigger } = await setupTest(testBuilder);
      const value = '12345';
      const testChain: CreateTestTemplateInput = {
        inputs: [
          { type: TemplateInputType.VALUE, name: 'first', value },
          { type: TemplateInputType.PASS_THROUGH, name: 'second' },
          { type: TemplateInputType.CONTEXT, name: 'third', value: 'object.text' },
        ],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitForActiveTriggers(space);

      const message = 'hello';
      createMessage(space, message);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        sequenceInput: message,
        templateSubstitutions: {
          first: value,
          second: message,
          third: message,
        },
      });
    });
  });

  describe('context', () => {
    const contextInput = (input: { name: string; value: string }) => {
      return {
        command: 'say',
        template: `value from context ${input.name}`,
        inputs: [{ type: TemplateInputType.CONTEXT, ...input }],
      } satisfies CreateTestTemplateInput;
    };

    test('falls back to message as context if no explicit context provided', async () => {
      const { space, functions, trigger } = await setupTest(testBuilder);
      const input = { name: 'message', value: 'object.text' };
      const thread = space.db.add(create(ThreadType, { messages: [] }));
      const testChain = contextInput(input);
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitForActiveTriggers(space);

      const messageContent = 'hello';
      createMessage(space, messageContent, { thread });
      await waitForCall(modelStub);
      expect(modelStub.calls[0]).to.deep.contain({
        templateSubstitutions: { [input.name]: messageContent },
      });
    });
  });

  // TODO(wittjosiah): Broke during schema transition.
  describe.skip('result', () => {
    test('appends model result to message blocks if no thread', async () => {
      const expectedResponse = 'hi from ai';
      modelStub.nextCallResult = expectedResponse;
      const { space, functions, trigger } = await setupTest(testBuilder);
      trigger.meta = { prompt: createTestChain(space) };
      await functions.waitForActiveTriggers(space);

      const message = createMessage(space, 'hello');
      const response = await waitForGptResponse(message);
      expect(response).to.eq(expectedResponse);
    });

    test('creates a new message in the thread if message is found there', async () => {
      const expectedResponse = 'hi from ai';
      modelStub.nextCallResult = expectedResponse;
      const { space, functions, trigger } = await setupTest(testBuilder);
      const thread = space.db.add(create(ThreadType, { messages: [] }));
      trigger.meta = { prompt: createTestChain(space) };
      await functions.waitForActiveTriggers(space);

      const message = createMessage(space, 'hello', { thread });
      const response = await waitForGptResponse(message, thread);
      expect(response).to.eq(expectedResponse);
    });
  });

  describe('chain selection', () => {
    test('loads a chain if message starts from prompt', async () => {
      const { space, functions } = await setupTest(testBuilder);
      const testChain: CreateTestTemplateInput = { command: 'say', template: 'chain template' };
      createTestChain(space, testChain);
      await functions.waitForActiveTriggers(space);

      const input = 'hello';
      createMessage(space, `/${testChain.command} ${input}`);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        template: testChain.template,
        sequenceInput: input,
      });
    });

    test('prompt in message overrides prompt in meta', async () => {
      const { space, functions, trigger } = await setupTest(testBuilder);
      const testChain: CreateTestTemplateInput = { command: 'say', template: 'chain template' };
      createTestChain(space, testChain);
      trigger.meta = { prompt: createTestChain(space, { command: 'another-cmd', template: 'another template' }) };
      await functions.waitForActiveTriggers(space);

      const input = 'hello';
      createMessage(space, `/${testChain.command} ${input}`);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        template: testChain.template,
        sequenceInput: input,
      });
    });
  });
});

const waitForCall = async (stub: StubModelInvoker) => {
  await waitForCondition({ condition: () => stub.lastCallArguments != null });
};

const waitForGptResponse = async (message: MessageType, thread?: ThreadType) => {
  const hasAiMeta = (obj: any) => getMeta(obj).keys[0].source === 'dxos.org/service/ai';
  if (thread) {
    await waitForCondition({ condition: () => hasAiMeta(thread.messages[thread.messages.length - 1]) });
    return (await thread.messages[thread.messages.length - 1].load())?.text;
  } else {
    // TODO(wittjosiah): Thread required.
    // await waitForCondition({ condition: () => hasAiMeta(message) });
    // return (await loadObjectReferences(message, (m) => m.blocks[1].content)).content;
  }
};

const setupTest = async (testBuilder: TestBuilder) => {
  const functions = await startFunctionsHost(testBuilder, initFunctionsPlugin, {
    baseDir: join(__dirname, '../../functions'),
  });
  const [app] = await createInitializedClients(testBuilder);
  const space = await app.spaces.create();
  app.addTypes([TemplateType, FunctionDef, FunctionTrigger, MessageType, TextType, ThreadType]);
  await inviteMember(space, functions.client);
  const trigger = createTrigger(space);
  return { space, functions, trigger, app };
};

const createMessage = (
  space: Space,
  content: string,
  options?: {
    thread?: ThreadType;
    context?: MessageType['context'];
  },
) => {
  const message = create(MessageType, {
    timestamp: new Date().toISOString(),
    sender: { name: 'unknown' },
    text: content,
    context: options?.context,
  });

  if (options?.thread) {
    options.thread.messages!.push(makeRef(message));
  } else {
    space.db.add(message);
  }

  return message;
};

const createTrigger = (space: Space, options?: { meta?: FunctionTrigger['meta'] }) => {
  const fn = space.db.add(
    create(FunctionDef, {
      uri: 'dxos.org/function/gpt',
      route: '/gpt',
      handler: 'gpt',
    }),
  );

  return space.db.add(
    create(FunctionTrigger, {
      function: fn.uri,
      enabled: true,
      meta: options?.meta,
      spec: {
        type: TriggerKind.Subscription,
        filter: { type: MessageType.typename },
      },
    }),
  );
};
