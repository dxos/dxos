//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import type * as Rpc from 'effect/rpc/Rpc';
import * as RpcClient from 'effect/rpc/RpcClient';
import type * as RpcGroup from 'effect/rpc/RpcGroup';
import type * as Scope from 'effect/Scope';

import { type RpcPort, type RpcRouter, makeProtocolRpcPortClient, makeProtocolRpcPortServer } from '@dxos/rpc';

import type * as Service from './Service.ts';

/** Asks the other host to serve its router on a port of a fresh channel. */
type ServeMessage = { readonly type: 'serve'; readonly port: MessagePort };

const isServeMessage = (data: unknown): data is ServeMessage =>
  typeof data === 'object' && data !== null && 'type' in data && data.type === 'serve' && 'port' in data;

/** A `MessagePort` as the byte port the rpc protocols run over. */
const toRpcPort = (port: MessagePort): RpcPort => ({
  send: (message) => port.postMessage(message),
  subscribe: (callback) => {
    const listener = (event: MessageEvent) => {
      if (event.data instanceof Uint8Array) {
        callback(event.data);
      }
    };
    port.addEventListener('message', listener);
    port.start();
    return () => port.removeEventListener('message', listener);
  },
});

/**
 * The connection between two hosts: one port over which either side hands the other a channel to
 * serve. Each rpc client gets its own channel, so a client's request ids never meet another's.
 */
export interface Link {
  /** A port the other host serves its router on. */
  open(): MessagePort;
  /** Called with each port the other host wants served. */
  onServe(callback: (port: MessagePort) => void): void;
  close(): void;
}

export const make = (port: MessagePort): Link => {
  const opened: MessagePort[] = [];
  let onServe: ((port: MessagePort) => void) | undefined;
  const pending: MessagePort[] = [];
  const listener = (event: MessageEvent) => {
    if (isServeMessage(event.data)) {
      opened.push(event.data.port);
      if (onServe) {
        onServe(event.data.port);
      } else {
        pending.push(event.data.port);
      }
    }
  };
  port.addEventListener('message', listener);
  port.start();

  return {
    open: () => {
      const channel = new MessageChannel();
      opened.push(channel.port1);
      const message: ServeMessage = { type: 'serve', port: channel.port2 };
      port.postMessage(message, [channel.port2]);
      return channel.port1;
    },
    onServe: (callback) => {
      onServe = callback;
      pending.splice(0).forEach(callback);
    },
    close: () => {
      port.removeEventListener('message', listener);
      opened.forEach((channel) => channel.close());
      port.close();
    },
  };
};

/** Serves every group registered with `router` on `port`, until the scope closes. */
export const serve = (router: RpcRouter.Service, port: MessagePort): Effect.Effect<void, never, Scope.Scope> =>
  Effect.gen(function* () {
    const protocol = yield* makeProtocolRpcPortServer(toRpcPort(port));
    yield* router.attach(protocol);
  });

/** The flattened rpc client of `group` over `port`, alive until the scope closes. */
export const call = (
  group: RpcGroup.RpcGroup<Rpc.Any>,
  port: MessagePort,
): Effect.Effect<Service.WireCall, never, Scope.Scope> =>
  Effect.gen(function* () {
    const protocol = yield* makeProtocolRpcPortClient(toRpcPort(port));
    const client = yield* RpcClient.make(group, { flatten: true, disableTracing: true }).pipe(
      Effect.provideService(RpcClient.Protocol, protocol),
    );
    // The client's parameter types are keyed by rpc tag, which a contract only knows at run time.
    return (tag, payload) => Reflect.apply(client, undefined, [tag, payload]);
  });
