//
// Copyright 2020 DXOS.org
//

import crypto from 'crypto';
import debug from 'debug';
import expect from 'expect';
import { it as test } from 'mocha';
import ProtocolStream from 'hypercore-protocol';
import pump from 'pump';
import waitForExpect from 'wait-for-expect';

import { ERR_EXTENSION_RESPONSE_FAILED, ERR_EXTENSION_RESPONSE_TIMEOUT } from './errors';
import { Extension } from './extension';
import { Protocol } from './protocol';

const log = debug('test');
debug.enable('test,protocol');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('Basic connection of two hypercore protocols', async () => {
  const topic = crypto.randomBytes(32);
  const alice: any = new ProtocolStream(true, {
    onhandshake: () => console.log('alices handshake'),
  })
  const bob: any = new ProtocolStream(false, {
    onhandshake: () => console.log('bobs handshake'),
  })

  const aliceChannel = alice.open(topic, {
    onoptions: (msg: any) => console.log('alice options', msg),
    onextension: () => console.log('alice onextension')
  })
  const bobChannel = bob.open(topic, {
    onoptions: (msg: any) => console.log('bob options', msg),
    onextension: (id: any, data: any) => console.log('bob onextension', id, data)
  })

  
  pump(alice, bob, alice);

  aliceChannel.options({
    extensions: ['ext-foo']
  })
  bobChannel.options({
    extensions: ['ext-foo']
  })
  aliceChannel.extension(0, Buffer.from([1, 2, 3]))


  await sleep(1000)
  // aliceChannel.data({ index: 1, value: '{ block: 42 }'})
})
