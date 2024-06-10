//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { sleep, Trigger, waitForCondition } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Filter } from '@dxos/echo-db';
import { create, splitMeta } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { TriggerRegistry } from './trigger-registry';
import { createInitializedClients, TestType, triggerWebhook } from '../testing';
import { type FunctionManifest, FunctionTrigger } from '../types';

const manifest: FunctionManifest = {
  triggers: [
    {
      '@meta': {
        keys: [
          {
            source: 'example.com',
            id: 'trigger-1',
          },
        ],
      },
      function: 'example.com/function/webhook-test',
      enabled: true,
      spec: {
        type: 'webhook',
        method: 'GET',
      },
    },
    {
      '@meta': {
        keys: [
          {
            source: 'example.com',
            id: 'trigger-2',
          },
        ],
      },
      function: 'example.com/function/subscription-test',
      enabled: true,
      spec: {
        type: 'subscription',
        filter: [
          {
            type: TestType.typename,
          },
        ],
      },
    },
  ],
};

chai.use(chaiAsPromised);

describe('trigger registry', () => {
  let ctx: Context;
  let testBuilder: TestBuilder;
  beforeEach(async () => {
    ctx = new Context();
    testBuilder = new TestBuilder();
  });
  afterEach(async () => {
    await ctx.dispose();
    await testBuilder.destroy();
  });

  describe('register', () => {
    test('creates new triggers', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      await registry.register(space, manifest);
      const { objects } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      expect(objects.length).to.eq(manifest.triggers?.length);

      const expected = manifest.triggers?.map((trigger) => trigger.function).sort();
      expect(objects.map((object: FunctionTrigger) => object.function).sort()).to.deep.eq(expected);
    });

    test('set meta', () => {
      const trigger = create(FunctionTrigger, {
        function: 'example.com/function/webhook-test',
        spec: {
          type: 'webhook',
          method: 'GET',
        },
      });

      (trigger.meta ??= {}).test = 100;
      expect(trigger.meta.test).to.eq(100);
    });
  });

  describe('activate', () => {
    test('invokes the provided callback', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, manifest);
      await registry.open(ctx);
      await waitForInactiveTriggers(registry, space);

      const callbackInvoked = new Trigger();
      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const webhookTrigger = allTriggers.find((trigger: FunctionTrigger) => trigger.spec.type === 'webhook')!;
      await registry.activate(space, webhookTrigger, async () => {
        callbackInvoked.wake();
        return 200;
      });

      setTimeout(() => triggerWebhook(space, webhookTrigger.function));
      await callbackInvoked.wait();
    });

    test('removes from inactive list', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, manifest);
      await registry.open(ctx);
      await waitForInactiveTriggers(registry, space);

      const inactiveTrigger = registry.getInactiveTriggers(space)[0];
      await registry.activate(space, inactiveTrigger, async () => 200);

      const updatedInactiveList = registry.getInactiveTriggers(space);
      expect(updatedInactiveList.find((trigger: FunctionTrigger) => trigger.function === inactiveTrigger.function)).to
        .be.undefined;
    });

    // TODO(burdon): Test enable/disable trigger.
  });

  describe('deactivate', () => {
    test('trigger object deletion deactivates a trigger', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, manifest);
      await registry.open(ctx);
      await waitForInactiveTriggers(registry, space);

      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const echoTrigger = allTriggers.find((trigger: FunctionTrigger) => trigger.spec.type === 'subscription')!;
      let count = 0;
      await registry.activate(space, echoTrigger, async () => {
        count++;
        return 200;
      });

      space.db.add(create(TestType, { title: '1' }));
      await sleep(20);
      expect(count).to.eq(1);

      space.db.remove(echoTrigger);
      space.db.add(create(TestType, { title: '2' }));
      await sleep(20);
      expect(count).to.eq(1);
    });

    test('registry closing deactivates a trigger', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, manifest);
      await registry.open(ctx);
      await waitForInactiveTriggers(registry, space);

      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const echoTrigger = allTriggers.find((trigger: FunctionTrigger) => trigger.spec.type === 'subscription')!;
      let count = 0;
      await registry.activate(space, echoTrigger, async () => {
        count++;
        return 200;
      });

      await registry.close();

      space.db.add(create(TestType, { title: '1' }));
      await sleep(20);
      expect(count).to.eq(0);
    });
  });

  describe('trigger events', () => {
    test('event fired when all registered are opened', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const registry = createRegistry(client);
      const triggers = createTriggers(client.spaces.default, 3);

      const triggersRegistered = new Trigger<FunctionTrigger[]>();
      registry.registered.on((fn) => {
        expect(fn.space.key.toHex()).to.eq(client.spaces.default.key.toHex());
        triggersRegistered.wake(fn.triggers);
      });

      void registry.open(ctx);
      const functions = await triggersRegistered.wait();
      const expected = triggers.map((object) => object.id).sort();
      expect(functions.map((fn) => fn.id).sort()).to.deep.eq(expected);
    });

    test('event fired when a new trigger is added', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const registry = createRegistry(client);
      const space = await client.spaces.create();

      const triggerRegistered = new Trigger<FunctionTrigger>();
      registry.registered.on((fn) => {
        expect(fn.triggers.length).to.eq(1);
        triggerRegistered.wake(fn.triggers[0]);
      });

      await registry.open(ctx);
      await registry.register(space, { triggers: manifest?.triggers?.slice(0, 1) });
      const registered = await triggerRegistered.wait();
      expect(registered.function).to.eq(manifest.triggers![0].function);
    });

    test('event fired when a new trigger is removed', async () => {
      const [client] = await createInitializedClients(testBuilder);
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      const triggers = createTriggers(space, 3);

      const triggerLoaded = new Trigger();
      registry.registered.on((fn) => triggerLoaded.wake());

      const triggerRemoved = new Trigger<FunctionTrigger>();
      registry.removed.on((fn) => {
        expect(fn.triggers.length).to.eq(1);
        triggerRemoved.wake(fn.triggers[0]);
      });

      await registry.register(space, manifest);
      await registry.open(ctx);
      await triggerLoaded.wait();

      space.db.remove(triggers[0]);
      const removedTrigger = await triggerRemoved.wait();
      expect(removedTrigger.id).to.eq(triggers[0].id);
    });
  });

  const createRegistry = (client: Client) => {
    const registry = new TriggerRegistry(client);
    ctx.onDispose(() => registry.close());
    return registry;
  };

  const createTriggers = (space: Space, count: number) => {
    const triggers = range(count, () => {
      const { meta, object } = splitMeta(manifest.triggers![0]);
      return create(FunctionTrigger, object, meta);
    });

    triggers.forEach((trigger) => space.db.add(trigger));
    return triggers;
  };

  const waitForInactiveTriggers = async (registry: TriggerRegistry, space: Space) => {
    await waitForCondition({ condition: () => registry.getInactiveTriggers(space).length > 0 });
  };
});
