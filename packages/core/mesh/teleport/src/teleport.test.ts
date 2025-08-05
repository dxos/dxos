//
// Copyright 2022 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { latch } from '@dxos/async';
import { log } from '@dxos/log';

import { TestBuilder, TestPeer } from './testing';
import { TestExtension } from './testing/test-extension';

describe('Teleport', () => {
  test('sends rpc via TestExtension', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const extension1 = new TestExtension();
    connection1.teleport!.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    connection2.teleport!.addExtension('example.testing.rpc', extension2);

    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    expect(extension1.extensionContext?.initiator).to.equal(true);
    expect(extension2.extensionContext?.initiator).to.equal(false);
  });

  test('disconnect', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const extension1 = new TestExtension();
    connection1.teleport.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    connection2.teleport.addExtension('example.testing.rpc', extension2);
    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    await peer2.destroy();

    await extension2.closed.wait({ timeout: 100 });
    await extension1.closed.wait({ timeout: 100 });
  });

  test('destroy is idempotent', async () => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const [peer1, peer2] = builder.createPeers({ factory: () => new TestPeer() });
    const [connection1, connection2] = await builder.connect(peer1, peer2);

    const extension1 = new TestExtension();
    connection1.teleport.addExtension('example.testing.rpc', extension1);
    const extension2 = new TestExtension();
    connection2.teleport.addExtension('example.testing.rpc', extension2);
    await extension1.test();
    log('test1 done');
    await extension2.test();
    log('test2 done');

    {
      // latch to ensure all 4 destroy calls are made.
      const [done, inc, errorHandler] = latch({ count: 4 });
      void peer1.destroy().then(inc, errorHandler);
      void peer1.destroy().then(inc, errorHandler);
      void peer2.destroy().then(inc, errorHandler);
      void peer2.destroy().then(inc, errorHandler);
      await done();
    }

    await extension2.closed.wait({ timeout: 100 });
    await extension1.closed.wait({ timeout: 100 });
  });
});
