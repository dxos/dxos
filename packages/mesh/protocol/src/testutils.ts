//
// Copyright 2021 DXOS.org
//

import pump from 'pump';

import { createPromiseFromCallback } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';

import { Extension } from './extension';
import { Protocol } from './protocol';

/**
 * Connect two protocols in-memory.
 *
 * If protocol is closed because of an error, this error will be propagated through the returned promise.
 */
export const pipeProtocols = (a: Protocol, b: Protocol) => createPromiseFromCallback(cb => pump(a.stream as any, b.stream as any, a.stream as any, cb));

export const createTestProtocolPair = (aExtensions: Extension[], bExtensions: Extension[]) => {
  const discoveryKey = PublicKey.random();
  const protocol1 = new Protocol({
    discoveryKey: discoveryKey.asBuffer(),
    initiator: true,
    streamOptions: {
      live: true
    },
    userSession: { peerId: 'user1' }
  }).setExtensions(
    aExtensions
  ).init();
  const protocol2 = new Protocol({
    discoveryKey: discoveryKey.asBuffer(),
    initiator: false,
    streamOptions: {
      live: true
    },
    userSession: { peerId: 'user2' }
  }).setExtensions(
    bExtensions
  ).init();

  void pipeProtocols(protocol1, protocol2);
};
