//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import * as RpcTest from 'effect/unstable/rpc/RpcTest';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { RTCService } from '@dxos/protocols/rpc';
import { type DuplexStream } from '@dxos/teleport';

import { type TransportOptions } from '../transport.ts';
import { RtcTransportProxy } from './rtc-transport-proxy.ts';

/** Longer than the old 3s close budget and shorter than the new one, so it brackets the change. */
const SLOW_HOST_CLOSE_MS = 4_000;

describe('RtcTransportProxy', () => {
  test(
    'close waits for a slow but alive host to finish tearing the connection down',
    async () => {
      let hostCloseCompleted = false;

      const handlers = RTCService.Rpcs.toLayer({
        'RTCService.open': () => Stream.never,
        'RTCService.sendSignal': () => Effect.void,
        'RTCService.close': () =>
          Effect.sleep(SLOW_HOST_CLOSE_MS).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                hostCloseCompleted = true;
              }),
            ),
          ),
        'RTCService.getDetails': () => Effect.never,
        'RTCService.getStats': () => Effect.never,
      });

      // The client outlives the effect that builds it, so the scope is held and closed by hand.
      const scope = Effect.runSync(Scope.make());
      try {
        const rtcService = await EffectEx.runPromise(
          RpcTest.makeClient(RTCService.Rpcs).pipe(Effect.provide(handlers), Scope.provide(scope)),
        );

        const transport = new RtcTransportProxy({ ...createTransportOptions(), rtcService });
        await transport.open();
        await transport.close();

        expect(hostCloseCompleted).to.be.true;
      } finally {
        // Released here rather than after the assertion, so a failing run still tears down the
        // in-memory RPC resources the scope holds.
        await EffectEx.runPromise(Scope.close(scope, Exit.void));
      }
    },
    SLOW_HOST_CLOSE_MS * 4,
  );

  const createTransportOptions = (): TransportOptions => {
    const stream: DuplexStream = {
      readable: new ReadableStream<Uint8Array>(),
      writable: new WritableStream<Uint8Array>(),
    };

    return {
      ownPeerKey: 'own',
      remotePeerKey: 'remote',
      topic: 'test',
      initiator: true,
      stream,
      sendSignal: async () => {},
    };
  };
});
