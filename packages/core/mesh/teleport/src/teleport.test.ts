//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { latch } from '@dxos/async';
import { log } from '@dxos/log';
import { afterTest, describe, test } from '@dxos/test';

import { TestExtension } from './test-extension';
import { TestBuilder } from './testing';

describe('Teleport', () => {
  test('sends rpc via TestExtension', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { agent1, agent2 } = await builder.createPipedAgents();

    const extension1 = new TestExtension();
    agent1.teleport!.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    agent2.teleport!.addExtension('example.testing.rpc', extension2);

    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    expect(extension1.extensionContext?.initiator).to.equal(true);
    expect(extension2.extensionContext?.initiator).to.equal(false);
  });

  test('disconnect', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { agent1, agent2 } = await builder.createPipedAgents();

    const extension1 = new TestExtension();
    agent1.teleport!.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    agent2.teleport!.addExtension('example.testing.rpc', extension2);
    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    await agent2.destroy();

    await extension2.closed.wait({ timeout: 100 });
    await extension1.closed.wait({ timeout: 100 });
  });

  test('destroy is idempotent', async () => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    const { agent1, agent2 } = await builder.createPipedAgents();

    const extension1 = new TestExtension();
    agent1.teleport!.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    agent2.teleport!.addExtension('example.testing.rpc', extension2);
    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    {
      // latch to ensure all 4 destroy calls are made.
      const [done, inc, errorHandler] = latch({ count: 4 });
      agent1.destroy().then(inc, errorHandler);
      agent1.destroy().then(inc, errorHandler);
      agent2.destroy().then(inc, errorHandler);
      agent2.destroy().then(inc, errorHandler);
      await done();
    }

    await extension2.closed.wait({ timeout: 100 });
    await extension1.closed.wait({ timeout: 100 });
  });
});
