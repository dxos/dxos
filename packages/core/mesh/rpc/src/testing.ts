//
// Copyright 2021 DXOS.org
//

import { RpcPort } from './rpc';

/**
 * Create bidirectionally linked ports.
 */
export const createLinkedPorts = (): [RpcPort, RpcPort] => {
  let port1Receive: RpcPort['send'] | undefined;
  let port2Receive: RpcPort['send'] | undefined;

  const port1: RpcPort = {
    send: (msg) => port2Receive?.(msg),
    subscribe: (cb) => {
      port1Receive = cb;
    }
  };

  const port2: RpcPort = {
    send: (msg) => port1Receive?.(msg),
    subscribe: (cb) => {
      port2Receive = cb;
    }
  };

  return [port1, port2];
};
