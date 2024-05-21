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
import { create } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';
import { range } from '@dxos/util';

import { TriggerRegistry } from './trigger-registry';
import { createInitializedClients, TestType, triggerWebhook } from '../testing';
import { type FunctionManifest, FunctionTrigger, FunctionTriggerType } from '../types';

const testManifest: FunctionManifest = {
  triggers: [
    {
      function: 'example.com/function/webhook-test',
      spec: {
        type: FunctionTriggerType.WEBHOOK,
        method: 'GET',
      },
    },
    {
      function: 'example.com/function/subscription-test',
      spec: {
        type: FunctionTriggerType.SUBSCRIPTION,
        filter: [{ type: TestType.typename }],
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
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      await registry.register(space, testManifest);
      const { objects } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      expect(objects.length).to.eq(testManifest.triggers?.length);
      const expected = testManifest.triggers?.map((t) => t.function).sort();
      expect(objects.map((o: FunctionTrigger) => o.function).sort()).to.deep.eq(expected);
    });
  });

  describe('activate', () => {
    test('invokes the provided callback', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, testManifest);
      await registry.open(ctx);
      await waitHasInactiveTriggers(registry, space);

      const callbackInvoked = new Trigger();
      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const webhookTrigger = allTriggers.find((t: FunctionTrigger) => t.spec.type === FunctionTriggerType.WEBHOOK)!;
      await registry.activate({ space }, webhookTrigger, async () => {
        callbackInvoked.wake();
        return 200;
      });

      setTimeout(() => triggerWebhook(space, webhookTrigger.function));
      await callbackInvoked.wait();
    });

    test('removes from inactive list', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, testManifest);
      await registry.open(ctx);
      await waitHasInactiveTriggers(registry, space);

      const inactiveTrigger = registry.getInactiveTriggers(space)[0];
      await registry.activate({ space }, inactiveTrigger, async () => 200);

      const updatedInactiveList = registry.getInactiveTriggers(space);
      expect(updatedInactiveList.find((t: FunctionTrigger) => t.function === inactiveTrigger.function)).to.be.undefined;
    });
  });

  describe('deactivate', () => {
    test('trigger object deletion deactivates a trigger', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, testManifest);
      await registry.open(ctx);
      await waitHasInactiveTriggers(registry, space);

      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const echoTrigger = allTriggers.find((t: FunctionTrigger) => t.spec.type === FunctionTriggerType.SUBSCRIPTION)!;
      let count = 0;
      await registry.activate({ space }, echoTrigger, async () => {
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
      const client = (await createInitializedClients(testBuilder))[0];
      const space = await client.spaces.create();
      const registry = createRegistry(client);
      await registry.register(space, testManifest);
      await registry.open(ctx);
      await waitHasInactiveTriggers(registry, space);

      const { objects: allTriggers } = await space.db.query(Filter.schema(FunctionTrigger)).run();
      const echoTrigger = allTriggers.find((t: FunctionTrigger) => t.spec.type === FunctionTriggerType.SUBSCRIPTION)!;
      let count = 0;
      await registry.activate({ space }, echoTrigger, async () => {
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
    test('event fired when all registered when opened', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const triggers = createTriggersInSpace(client.spaces.default, 3);

      const triggersRegistered = new Trigger<FunctionTrigger[]>();
      registry.registered.on((fn) => {
        expect(fn.space.key.toHex()).to.eq(client.spaces.default.key.toHex());
        triggersRegistered.wake(fn.triggers);
      });
      void registry.open(ctx);
      const functions = await triggersRegistered.wait();
      const expected = triggers.map((obj) => obj.id).sort();
      expect(functions.map((fn) => fn.id).sort()).to.deep.eq(expected);
    });

    test('event fired when a new trigger is added', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();

      const triggerRegistered = new Trigger<FunctionTrigger>();
      registry.registered.on((fn) => {
        expect(fn.triggers.length).to.eq(1);
        triggerRegistered.wake(fn.triggers[0]);
      });
      await registry.open(ctx);
      await registry.register(space, { triggers: testManifest?.triggers?.slice(0, 1) });
      const registered = await triggerRegistered.wait();
      expect(registered.function).to.eq(testManifest.triggers![0].function);
    });

    test('event fired when a new trigger is removed', async () => {
      const client = (await createInitializedClients(testBuilder))[0];
      const registry = createRegistry(client);
      const space = await client.spaces.create();
      const triggers = createTriggersInSpace(space, 3);

      const triggerLoaded = new Trigger();
      registry.registered.on((fn) => triggerLoaded.wake());

      const triggerRemoved = new Trigger<FunctionTrigger>();
      registry.removed.on((fn) => {
        expect(fn.triggers.length).to.eq(1);
        triggerRemoved.wake(fn.triggers[0]);
      });
      await registry.register(space, testManifest);
      await registry.open(ctx);
      await triggerLoaded.wait();

      space.db.remove(triggers[0]);
      const removedTrigger = await triggerRemoved.wait();
      expect(removedTrigger.id).to.eq(triggers[0].id);
    });
  });

  const waitHasInactiveTriggers = async (registry: TriggerRegistry, space: Space) => {
    await waitForCondition({ condition: () => registry.getInactiveTriggers(space).length > 0 });
  };

  const createRegistry = (client: Client) => {
    const registry = new TriggerRegistry(client);
    ctx.onDispose(() => registry.close());
    return registry;
  };

  const createTriggersInSpace = (space: Space, count: number) => {
    const triggers = range(count, () => create(FunctionTrigger, { ...testManifest.triggers![0] }));
    triggers.forEach((def) => space.db.add(def));
    return triggers;
  };
});
