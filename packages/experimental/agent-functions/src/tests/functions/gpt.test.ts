//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { join } from 'path';

import { ChainInputType, ChainPromptType, MessageType, ThreadType } from '@braneframe/types';
import { waitForCondition } from '@dxos/async';
import { getMeta, type Space } from '@dxos/client/echo';
import { TestBuilder, TextV0Type } from '@dxos/client/testing';
import { loadObjectReferences } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { FunctionDef, FunctionTrigger } from '@dxos/functions';
import { createInitializedClients, inviteMember, startFunctionsHost } from '@dxos/functions/testing';
import { test } from '@dxos/test';

import { type ChainResources } from '../../chain';
import { ModelInvokerFactory } from '../../chain/model-invoker';
import { initFunctionsPlugin } from '../setup';
import { StubModelInvoker } from '../stub-invoker';
import { createTestChain, type CreateTestChainInput } from '../test-chain-builder';

describe.only('Gpt', () => {
  let modelStub: StubModelInvoker;
  let testBuilder: TestBuilder;
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

  // TODO(wittjosiah): Broke during schema transition.
  describe.skip('inputs', () => {
    test('pass_through', async () => {
      const { functions, trigger, space } = await setupTest(testBuilder);
      const testChain: CreateTestChainInput = {
        command: 'example',
        template: 'example {input}',
        inputs: [{ type: ChainInputType.PASS_THROUGH, name: 'input' }],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitHasActiveTriggers(space);
      const message = 'hello';
      writeMessage(space, message);
      await waitForCall(modelStub);
      expect(modelStub.calls[0]).to.deep.contain({
        template: testChain.template,
        sequenceInput: message,
        templateSubstitutions: { input: message },
      });
    });

    test('value', async () => {
      const { functions, trigger, space } = await setupTest(testBuilder);
      const value = '12345';
      const testChain: CreateTestChainInput = {
        command: 'example-2',
        template: 'example {valueName}',
        inputs: [{ type: ChainInputType.VALUE, name: 'valueName', value }],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitHasActiveTriggers(space);
      const message = 'hello';
      writeMessage(space, message);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        template: testChain.template,
        sequenceInput: message,
        templateSubstitutions: { valueName: value },
      });
    });

    test('multiple inputs', async () => {
      const { functions, trigger, space } = await setupTest(testBuilder);
      const value = '12345';
      const testChain: CreateTestChainInput = {
        inputs: [
          { type: ChainInputType.VALUE, name: 'first', value },
          { type: ChainInputType.PASS_THROUGH, name: 'second' },
          { type: ChainInputType.CONTEXT, name: 'third', value: 'object.blocks[0].content' },
        ],
      };
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitHasActiveTriggers(space);
      const message = 'hello';
      writeMessage(space, message);
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

  // TODO(wittjosiah): Broke during schema transition.
  describe.skip('context', () => {
    const contextInput = (input: { name: string; value: string }) => {
      return {
        command: 'say',
        template: `value from context ${input.name}`,
        inputs: [{ type: ChainInputType.CONTEXT, ...input }],
      } satisfies CreateTestChainInput;
    };

    test('falls back to message as context if no explicit context provided', async () => {
      const { functions, trigger, space } = await setupTest(testBuilder);
      const input = { name: 'message', value: 'object.blocks[0].content' };
      const thread = space.db.add(create(ThreadType, { messages: [] }));
      const testChain = contextInput(input);
      trigger.meta = { prompt: createTestChain(space, testChain) };
      await functions.waitHasActiveTriggers(space);
      const messageContent = 'hello';
      writeMessage(space, messageContent, { thread });
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
      const { functions, trigger, space } = await setupTest(testBuilder);
      trigger.meta = { prompt: createTestChain(space) };
      await functions.waitHasActiveTriggers(space);
      const message = writeMessage(space, 'hello');
      const response = await waitForGptResponse(message);
      expect(response).to.eq(expectedResponse);
    });

    test('creates a new message in the thread if message is found there', async () => {
      const expectedResponse = 'hi from ai';
      modelStub.nextCallResult = expectedResponse;
      const { functions, trigger, space } = await setupTest(testBuilder);
      const thread = space.db.add(create(ThreadType, { messages: [] }));
      trigger.meta = { prompt: createTestChain(space) };
      await functions.waitHasActiveTriggers(space);
      const message = writeMessage(space, 'hello', { thread });
      const response = await waitForGptResponse(message, thread);
      expect(response).to.eq(expectedResponse);
    });
  });

  describe('chain selection', () => {
    test('loads a chain if message starts from prompt', async () => {
      const { functions, space } = await setupTest(testBuilder);
      const testChain: CreateTestChainInput = { command: 'say', template: 'chain template' };
      createTestChain(space, testChain);
      await functions.waitHasActiveTriggers(space);
      const input = 'hello';
      writeMessage(space, `/${testChain.command} ${input}`);
      await waitForCall(modelStub);
      expect(modelStub.lastCallArguments).to.deep.contain({
        template: testChain.template,
        sequenceInput: input,
      });
    });

    test('prompt in message overrides prompt in meta', async () => {
      const { functions, trigger, space } = await setupTest(testBuilder);
      const testChain: CreateTestChainInput = { command: 'say', template: 'chain template' };
      createTestChain(space, testChain);
      trigger.meta = { prompt: createTestChain(space, { command: 'another-cmd', template: 'another template' }) };
      await functions.waitHasActiveTriggers(space);
      const input = 'hello';
      writeMessage(space, `/${testChain.command} ${input}`);
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
  app.addTypes([TextV0Type, MessageType, ThreadType, ChainPromptType, FunctionDef, FunctionTrigger]);
  await inviteMember(space, functions.client);
  const trigger = triggerGptOnMessage(space);
  return { functions, app, space, trigger };
};

const writeMessage = (
  space: Space,
  content: string,
  options?: {
    thread?: ThreadType;
    context?: MessageType['context'];
  },
) => {
  const message = create(MessageType, {
    sender: { name: 'unknown' },
    context: options?.context,
    timestamp: new Date().toISOString(),
    text: content,
  });
  if (options?.thread) {
    options.thread.messages!.push(message);
  } else {
    space.db.add(message);
  }
  return message;
};

const triggerGptOnMessage = (space: Space, options?: { meta?: FunctionTrigger['meta'] }) => {
  const uri = 'dxos.org/function/gpt';
  space.db.add(create(FunctionDef, { uri, route: '/gpt', handler: 'gpt' }));
  return space.db.add(
    create(FunctionTrigger, {
      function: uri,
      enabled: true,
      meta: options?.meta,
      spec: {
        type: 'subscription',
        filter: [{ type: MessageType.typename }],
      },
    }),
  );
};
