//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { DataObject } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { TestBuilder } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';

import { ObjectSync } from './object-sync';

describe('ObjectSync', () => {
  test('two peers synchronize an object', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());
    const { peer1, peer2 } = await testBuilder.createPipedPeers();

    const objectSync1 = new ObjectSync({
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
    });
    peer1.teleport!.addExtension('dxos.mesh.teleport.objectsync', objectSync1.createExtension());

    const objectSync2 = new ObjectSync({
      getObject: async (id: string) => {
        return undefined;
      },
      setObject: async (data: DataObject) => {
        // console.log('setObject', data);
      }
    });
    peer2.teleport!.addExtension('dxos.mesh.teleport.objectsync', objectSync2.createExtension());

    const obj = await objectSync2.download('test');
    expect(obj).toEqual({
      id: 'test',
      payload: {
        '@type': 'google.protobuf.Any',
        type_url: 'test',
        value: Buffer.from('test')
      }
    });

    await objectSync1.close();
    await objectSync2.close();
  });
});
