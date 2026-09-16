//
// Copyright 2026 DXOS.org
//

import * as BrowserWorker from '@effect/platform-browser/BrowserWorker';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';

import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { RTCService } from '@dxos/protocols/rpc';

import { RtcTransportProxy } from '../rtc-transport-proxy.ts';
import { type ProxyWorkerRequest, type ProxyWorkerResponse } from './rtc-proxy-worker-protocol.ts';

/**
 * Worker half of the RTC handover e2e: it holds no `RTCPeerConnection` at all, only
 * {@link RtcTransportProxy} instances driving the page's `RtcService` over rpc. Once the page
 * transfers each `RTCDataChannel` here, the wire protocol runs entirely inside this thread.
 */

const post = (message: ProxyWorkerResponse): void => self.postMessage(message);

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Reports what the remote peer wrote, and lets the test push outbound payloads. */
const createStream = (peer: 'a' | 'b') => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  return {
    readable: new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        controller = ctrl;
      },
    }),
    writable: new WritableStream<Uint8Array>({
      write: (chunk) => {
        post({ type: 'received', peer, data: decoder.decode(chunk) });
      },
    }),
    push: (data: Uint8Array) => controller.enqueue(data),
  };
};

const makeClient = async (port: MessagePort): Promise<RTCService.Client> => {
  // The client outlives this call, so the scope is held rather than closed around it; the worker is
  // torn down with the test. The transport is built with `Layer.build` into that scope rather than
  // `Effect.provide`d, which would close the connection the moment the client is returned.
  const scope = Effect.runSync(Scope.make());
  return (await EffectEx.runPromise(
    Effect.gen(function* () {
      const context = yield* Layer.build(
        RpcClient.layerProtocolWorker({ size: 1, concurrency: Number.MAX_SAFE_INTEGER }).pipe(
          Layer.provide(BrowserWorker.layer(() => port)),
        ),
      );
      return yield* RpcClient.make(RTCService.Rpcs, { disableTracing: true }).pipe(Effect.provide(context));
    }).pipe(Effect.orDie, Scope.provide(scope)),
  )) as RTCService.Client;
};

const start = async (port: MessagePort): Promise<void> => {
  const rtcService = await makeClient(port);

  const topic = PublicKey.random().toHex();
  const peerKeyA = PublicKey.random().toHex();
  const peerKeyB = PublicKey.random().toHex();

  const streamA = createStream('a');
  const streamB = createStream('b');

  const proxyA: RtcTransportProxy = new RtcTransportProxy({
    rtcService,
    topic,
    initiator: true,
    ownPeerKey: peerKeyA,
    remotePeerKey: peerKeyB,
    stream: streamA,
    sendSignal: async (signal) => proxyB.onSignal(signal),
  });

  const proxyB: RtcTransportProxy = new RtcTransportProxy({
    rtcService,
    topic,
    initiator: false,
    ownPeerKey: peerKeyB,
    remotePeerKey: peerKeyA,
    stream: streamB,
    sendSignal: async (signal) => proxyA.onSignal(signal),
  });

  let connected = 0;
  for (const proxy of [proxyA, proxyB]) {
    proxy.connected.on(() => {
      if (++connected === 2) {
        post({ type: 'connected' });
      }
    });
    proxy.errors.handle((error) => post({ type: 'error', message: error.message }));
  }

  self.addEventListener('message', ({ data }: MessageEvent<ProxyWorkerRequest>) => {
    if (data.type === 'send') {
      (data.peer === 'a' ? streamA : streamB).push(encoder.encode(data.data));
    }
  });

  await proxyA.open();
  await proxyB.open();
};

self.addEventListener('message', ({ data }: MessageEvent<ProxyWorkerRequest>) => {
  if (data.type === 'start') {
    start(data.port).catch((error) => post({ type: 'error', message: String(error?.message ?? error) }));
  }
});
