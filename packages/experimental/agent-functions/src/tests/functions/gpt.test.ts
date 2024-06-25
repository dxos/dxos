//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { join } from 'path';

import { ChainInputType, ChainPromptType, MessageType, TextType, ThreadType } from '@braneframe/types';
import { waitForCondition } from '@dxos/async';
import { getMeta, type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { loadObjectReferences } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';
import { createInitializedClients, inviteMember, startFunctionsHost } from '@dxos/functions/testing';
import { test } from '@dxos/test';

import { type ChainResources, ModelInvokerFactory } from '../../chain';
import { StubModelInvoker } from '../../functions/gpt/testing';
import { initFunctionsPlugin } from '../setup';
import { createTestChain, type CreateTestChainInput } from '../test-chain-builder';

describe('GPT', () => {
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
      const testChain: CreateTestChainInput = {
        template: 'example {input}',
        inputs: [{ type: ChainInputType.PASS_THROUGH, name: 'input' }],
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
      const testChain: CreateTestChainInput = {
        template: 'example {input}',
        inputs: [{ type: ChainInputType.VALUE, name: 'input', value }],
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
      const testChain: CreateTestChainInput = {
        inputs: [
          { type: ChainInputType.VALUE, name: 'first', value },
          { type: ChainInputType.PASS_THROUGH, name: 'second' },
          { type: ChainInputType.CONTEXT, name: 'third', value: 'object.text' },
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
        inputs: [{ type: ChainInputType.CONTEXT, ...input }],
      } satisfies CreateTestChainInput;
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
      const testChain: CreateTestChainInput = { command: 'say', template: 'chain template' };
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
      const testChain: CreateTestChainInput = { command: 'say', template: 'chain template' };
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
    return loadObjectReferences(thread, (t) => t.messages[t.messages.length - 1]?.text);
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
  app.addTypes([ChainPromptType, FunctionDef, FunctionTrigger, MessageType, TextType, ThreadType]);
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
    options.thread.messages!.push(message);
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
        type: 'subscription',
        filter: [{ type: MessageType.typename }],
      },
    }),
  );
};
