//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

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
                  value: Buffer.from(id)
                }
              };
            },
            setObject: async (data: DataObject) => {
              // console.log('setObject', data);
            }
          })
        )
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
            }
          })
        )
    });

    await testBuilder.connect(peer1, peer2);

    const obj = await peer2.objectSync.download('test');
    expect(obj).toEqual({
      id: 'test',
      payload: {
        '@type': 'google.protobuf.Any',
        type_url: 'test',
        value: Buffer.from('test')
      }
    });
  });
});
