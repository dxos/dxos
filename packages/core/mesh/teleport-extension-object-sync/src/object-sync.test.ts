//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Context } from '@dxos/context';
import { DataObject } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { TestBuilder, TestPeer, TestConnection } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { ObjectSync } from './object-sync';

class TestAgent extends TestPeer {
  constructor(public objectSync: ObjectSync) {
    super();
  }

  protected override async onOpen(connection: TestConnection): Promise<void> {
    await super.onOpen(connection);
    connection.teleport.addExtension('dxos.mesh.teleport.objectsync', this.objectSync.createExtension());
  }

  override async destroy(): Promise<void> {
    await super.destroy();
    await this.objectSync.close();
  }
}

describe('ObjectSync', () => {
  test('two peers synchronize an object', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    const peer1 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              return {
                id,
                payload: {
                  '@type': 'google.protobuf.Any',
                  type_url: 'test',
                  value: Buffer.from(id),
                },
              };
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    const peer2 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              return undefined;
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    await testBuilder.connect(peer1, peer2);

    const obj = await peer2.objectSync.download(new Context(), 'test');
    expect(obj).toEqual({
      id: 'test',
      payload: {
        '@type': 'google.protobuf.Any',
        type_url: 'test',
        value: Buffer.from('test'),
      },
    });
  });

  test('cancel request', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    // Trigger to start the replication
    const startTrigger = new Trigger();

    const peer1 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              await startTrigger.wait();
              return {
                id,
                payload: {
                  '@type': 'google.protobuf.Any',
                  type_url: 'test',
                  value: Buffer.from(id),
                },
              };
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    const peer2 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              return undefined;
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    await testBuilder.connect(peer1, peer2);

    // Start the test.
    const ctx1 = new Context();
    const obj1 = peer2.objectSync.download(ctx1, 'test');
    await ctx1.dispose();
    startTrigger.wake();
    await expect(async () => asyncTimeout(obj1, 500)).rejects.toThrow();
  });

  test('object synchronization tracks amount of requests', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());

    // Trigger to start replication.
    const startTrigger = new Trigger();

    const peer1 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              await startTrigger.wait();
              return {
                id,
                payload: {
                  '@type': 'google.protobuf.Any',
                  type_url: 'test',
                  value: Buffer.from(id),
                },
              };
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    const peer2 = await testBuilder.createPeer({
      factory: () =>
        new TestAgent(
          new ObjectSync({
            getObject: async (id: string) => {
              return undefined;
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            },
          }),
        ),
    });

    await testBuilder.connect(peer1, peer2);

    const ctx1 = new Context();
    const obj1 = peer2.objectSync.download(ctx1, 'test');

    const ctx2 = new Context();
    const obj2 = peer2.objectSync.download(ctx2, 'test');

    // Start the test.
    await ctx1.dispose();
    startTrigger.wake();
    await expect(async () => asyncTimeout(obj1, 500)).rejects.toThrow();
    expect(await obj2).toEqual({
      id: 'test',
      payload: {
        '@type': 'google.protobuf.Any',
        type_url: 'test',
        value: Buffer.from('test'),
      },
    });
  });
});
