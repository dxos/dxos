//
// Copyright 2021 DXOS.org
//

import { RpcPort } from './rpc';

export const createLinkedPorts = (): [RpcPort, RpcPort] => {
  let aliceReceive: RpcPort['send'] | undefined;
  let bobReceive: RpcPort['send'] | undefined;

  const alice: RpcPort = {
    send: msg => bobReceive?.(msg),
    subscribe: cb => {
      aliceReceive = cb;
    }
  };
  const bob: RpcPort = {
    send: msg => aliceReceive?.(msg),
    subscribe: cb => {
      bobReceive = cb;
    }
  };

  return [alice, bob];
};
