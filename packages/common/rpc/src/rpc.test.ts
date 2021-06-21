//
// Copyright 2021 DXOS.org
//

import { expect } from 'earljs';
import { it as test } from 'mocha';

import { sleep } from '@dxos/async';

import { SerializedRpcError } from './errors';
import { RpcPeer } from './rpc';

describe('RpcPeer', () => {
  test('can open', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();
  });

  test('can send a request', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async (method, msg) => {
        expect(method).toEqual('method');
        expect(msg).toEqual(Buffer.from('request'));
        return Buffer.from('response');
      },
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async (method, msg) => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();

    const response = await bob.call('method', Buffer.from('request'));
    expect(response).toEqual(Buffer.from('response'));
  });

  test('can send multiple requests', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async (method, msg) => {
        expect(method).toEqual('method');
        await sleep(5);

        const text = Buffer.from(msg).toString();

        if (text === 'error') {
          throw new Error('test error');
        }

        return msg;
      },
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();

    expect(await bob.call('method', Buffer.from('request'))).toEqual(Buffer.from('request'));

    const parallel1 = bob.call('method', Buffer.from('p1'));
    const parallel2 = bob.call('method', Buffer.from('p2'));
    const error = bob.call('method', Buffer.from('error'));

    await expect(await parallel1).toEqual(Buffer.from('p1'));
    await expect(await parallel2).toEqual(Buffer.from('p2'));
    await expect(error).toBeRejected();
  });

  test('errors get serialized', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async (method, msg) => {
        expect(method).toEqual('method');
        async function handlerFn (): Promise<never> {
          throw new Error('My error');
        }

        return await handlerFn();
      },
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();

    let error!: Error;
    try {
      await bob.call('method', Buffer.from('request'));
    } catch (err) {
      error = err;
    }

    expect(error).toBeA(SerializedRpcError);
    expect(error.message).toEqual('My error');
    expect(error.stack?.includes('handlerFn')).toEqual(true);
  });

  test('closing local endpoint stops pending requests', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async (method, msg) => {
        expect(method).toEqual('method');
        await sleep(5);
        return msg;
      },
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();

    const req = bob.call('method', Buffer.from('request'));
    bob.close();

    await expect(req).toBeRejected();
  });

  test('closing remote endpoint stops pending requests', async () => {
    const alice: RpcPeer = new RpcPeer({
      messageHandler: async (method, msg) => {
        expect(method).toEqual('method');
        await sleep(5);
        return msg;
      },
      send: msg => bob.receive(msg)
    });
    const bob = new RpcPeer({
      messageHandler: async msg => new Uint8Array(),
      send: msg => alice.receive(msg)
    });

    await alice.open();
    await bob.open();

    alice.close();
    const req = bob.call('method', Buffer.from('request'));

    await expect(req).toBeRejected();
  });
});
