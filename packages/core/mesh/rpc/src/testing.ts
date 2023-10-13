//
// Copyright 2021 DXOS.org
//

import { type RpcPort } from './rpc';

export type CreateLinkedPortsOptions = {
  delay?: number;
};

/**
 * Create bi-directionally linked ports.
 */
export const createLinkedPorts = ({ delay }: CreateLinkedPortsOptions = {}): [RpcPort, RpcPort] => {
  let port1Received: RpcPort['send'] | undefined;
  let port2Received: RpcPort['send'] | undefined;

  const send = (handler: RpcPort['send'] | undefined, msg: Uint8Array) => {
    if (delay) {
      setTimeout(() => handler?.(msg), delay);
    } else {
      void handler?.(msg);
    }
  };

  const port1: RpcPort = {
    send: (msg) => send(port2Received, msg),
    subscribe: (cb) => {
      port1Received = cb;
    },
  };

  const port2: RpcPort = {
    send: (msg) => send(port1Received, msg),
    subscribe: (cb) => {
      port2Received = cb;
    },
  };

  return [port1, port2];
};
