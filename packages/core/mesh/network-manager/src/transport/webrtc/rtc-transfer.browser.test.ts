//
// Copyright 2026 DXOS.org
//

import * as BrowserWorkerRunner from '@effect/platform-browser/BrowserWorkerRunner';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { normalizeHandlers } from '@dxos/protocols';
import { RTCService } from '@dxos/protocols/rpc';

import { RtcService } from './rtc-service.ts';
import { type ProxyWorkerRequest, type ProxyWorkerResponse } from './testing/rtc-proxy-worker-protocol.ts';

/**
 * End-to-end check of the RTC handover: the page owns both `RTCPeerConnection`s through
 * {@link RtcService} and serves it over a `MessagePort`; a worker drives the connection with
 * `RtcTransportProxy` and receives each `RTCDataChannel` as a transfer. Data therefore never crosses
 * the rpc boundary — if the transfer did not work, nothing would ever connect.
 */
describe('RTCDataChannel handover to a worker', () => {
  const setup = async () => {
    const service = new RtcService();
    const channel = new MessageChannel();

    const server = ManagedRuntime.make(
      RpcServer.layer(RTCService.Rpcs, { disableTracing: true, concurrency: 'unbounded' }).pipe(
        Layer.provide(RTCService.Rpcs.toLayer(normalizeHandlers(RTCService.Rpcs, service) as never)),
        Layer.provide(
          RpcServer.layerProtocolWorkerRunner.pipe(Layer.provide(BrowserWorkerRunner.layerMessagePort(channel.port1))),
        ),
        Layer.orDie,
      ),
    );
    await server.runPromise(Effect.void);

    const worker = new Worker(new URL('./testing/rtc-proxy-worker.ts', import.meta.url), { type: 'module' });
    const received: ProxyWorkerResponse[] = [];
    const connected = new Trigger();
    const failed = new Trigger<string>();
    // A module-load failure in the worker never reaches `message`, so it would otherwise surface
    // only as the connect timeout.
    worker.addEventListener('error', (event) => failed.wake(event.message ?? 'worker error'));
    worker.addEventListener('messageerror', () => failed.wake('worker message error'));
    worker.addEventListener('message', ({ data }: MessageEvent<ProxyWorkerResponse>) => {
      received.push(data);
      if (data.type === 'connected') {
        connected.wake();
      } else if (data.type === 'error') {
        failed.wake(data.message);
      }
    });

    onTestFinished(async () => {
      worker.terminate();
      await server.dispose();
      channel.port1.close();
      channel.port2.close();
    });

    const post = (message: ProxyWorkerRequest, transfer?: Transferable[]) =>
      worker.postMessage(message, transfer ?? []);
    post({ type: 'start', port: channel.port2 }, [channel.port2]);

    /** Resolves when the worker reports `data` arriving on `peer`, or rejects on a proxy error. */
    const expectReceived = (peer: 'a' | 'b', data: string) => {
      const seen = () =>
        received.some((message) => message.type === 'received' && message.peer === peer && message.data === data);
      return asyncTimeout(
        orFailed(
          new Promise<void>((resolve) => {
            if (seen()) {
              resolve();
              return;
            }
            worker.addEventListener('message', () => seen() && resolve());
          }),
          failed,
        ),
        15_000,
      );
    };

    return { service, connected, failed, post, expectReceived };
  };

  test('connects and carries data over the transferred channel', { timeout: 30_000 }, async () => {
    const { service, connected, failed, post, expectReceived } = await setup();

    await asyncTimeout(orFailed(connected.wait(), failed), 20_000);
    expect(service.hasOpenConnections()).toBeTruthy();

    post({ type: 'send', peer: 'a', data: 'hello from a' });
    await expectReceived('b', 'hello from a');

    post({ type: 'send', peer: 'b', data: 'hello from b' });
    await expectReceived('a', 'hello from b');
  });
});

/** Rejects as soon as the worker reports a proxy error, rather than waiting out the timeout. */
const orFailed = <T>(promise: Promise<T>, failed: Trigger<string>): Promise<T> =>
  Promise.race([promise, failed.wait().then((message) => Promise.reject(new Error(message)))]);
