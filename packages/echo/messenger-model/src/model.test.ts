//
// Copyright 2021 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createModelTestBench } from '@dxos/echo-db';

import { MessengerModel } from './model';

describe('MessengerModel', () => {
  test('send message', async () => {
    const { items: [item1, item2], peers } = await createModelTestBench({ model: MessengerModel });
    after(async () => Promise.all(peers.map(peer => peer.close())));

    await item1.model.sendMessage({ text: 'ping', sender: 'peer1' });

    await item2.model.update.waitForCount(1);
    expect(item2.model.messages[0].text).toBe('ping');

    await item2.model.sendMessage({ text: 'pong', sender: 'peer2' });

    await item1.model.update.waitForCount(1);
    expect(item1.model.messages[1].text).toBe('pong');
  });
});
