//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Event, waitForCondition } from '@dxos/async';
import { Protocol } from '@dxos/protocol';
import { RpcPort } from '@dxos/rpc';

import { extensionName } from './extension-name';

export interface SerializedObject {
  data: Buffer
}

export const getPeerId = (peer: Protocol) => {
  const { peerId } = peer.getSession() ?? {};
  return peerId as string;
};

export const createPort = async (peer: Protocol, receive: Event<SerializedObject>): Promise<RpcPort> => {
  await waitForCondition(() => peer.connected);
  return {
    send: async (msg) => {
      assert(peer.connected, 'Peer is not connected');
      const extension = peer.getExtension(extensionName);
      assert(extension, 'Extension is not set');
      await extension.send(msg);
    },
    subscribe: (cb) => {
      const adapterCallback = (obj: SerializedObject) => {
        cb(obj.data);
      };
      receive.on(adapterCallback);
      return () => receive.off(adapterCallback);
    }
  };
};
