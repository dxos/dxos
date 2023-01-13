//
// Copyright 2021 DXOS.org
//

import { RpcPort } from './rpc';

/**
 * Create bi-directionally linked ports.
 */
export const createLinkedPorts = (): [RpcPort, RpcPort] => {
  let port1Received: RpcPort['send'] | undefined;
  let port2Received: RpcPort['send'] | undefined;

  const port1: RpcPort = {
    send: (msg) => port2Received?.(msg),
    subscribe: (cb) => {
      port1Received = cb;
    }
  };

  const port2: RpcPort = {
    send: (msg) => port1Received?.(msg),
    subscribe: (cb) => {
      port2Received = cb;
    }
  };

  return [port1, port2];
};
