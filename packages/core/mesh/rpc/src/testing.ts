//
// Copyright 2021 DXOS.org
//

import { type RpcPort } from './rpc.ts';

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

// A plain `Uint8Array` in both runtimes: buf decodes a payload as a view over the frame it read, so
// a `Buffer` here would only ever match by coincidence of environment.
export const encodeMessage = (msg: string): Uint8Array => new TextEncoder().encode(msg);
