//
// Copyright 2020 DXOS.org
//

import crypto from 'crypto';
import expect from 'expect';
import ProtocolStream from 'hypercore-protocol';
import pump from 'pump';

import { createPromiseFromCallback } from '@dxos/async';

describe('hypercore-protocol', function () {
  it('Basic connection of two hypercore protocols', async function () {
    let aliceHandshake = false;
    let bobHandshake = false;
    let aliceOptions = false;
    let bobOptions = false;
    let aliceOnExtension = false;
    let bobOnExtension = false;
    let aliceReceivedMessageInExtension: Buffer | undefined;

    const topic = crypto.randomBytes(32);
    const alice = new ProtocolStream(true, {
      onhandshake: () => {
        aliceHandshake = true;
      }
    });
    const bob = new ProtocolStream(false, {
      onhandshake: () => {
        bobHandshake = true;
      }
    });

    const aliceChannel = alice.open(topic, {
      onoptions: (msg: any) => {
        aliceOptions = true;
      },
      onextension: (id: any, data: any) => {
        aliceOnExtension = true;
      }
    });
    const bobChannel = bob.open(topic, {
      onoptions: (msg: any) => {
        bobOptions = true;
      },
      onextension: (id: any, data: any) => {
        bobOnExtension = true;
      }
    });

    aliceChannel.options({
      extensions: ['ext-foo']
    });
    bobChannel.options({
      extensions: ['ext-foo']
    });
    aliceChannel.extension(0, Buffer.from([1, 2, 3]));

    alice.registerExtension('ext-on-stream', {
      onmessage: (msg: any) => {
        aliceReceivedMessageInExtension = msg;
        alice.finalize();
      }
    });
    const bobExt = bob.registerExtension('ext-on-stream', {

    });

    bobExt.send(Buffer.from([4, 5, 6]));

    await createPromiseFromCallback(cb => pump(alice as any, bob as any, alice as any, cb));

    // code aliceChannel.data({ index: 1, value: '{ block: 42 }'})

    expect(aliceHandshake).toBe(true);
    expect(bobHandshake).toBe(true);
    expect(aliceOptions).toBe(true);
    expect(bobOptions).toBe(true);
    expect(aliceOnExtension).toBe(false); // Bob never register an extension over the channel.
    expect(bobOnExtension).toBe(true);
    expect(aliceReceivedMessageInExtension).toEqual(Buffer.from([4, 5, 6]));
  });
});
