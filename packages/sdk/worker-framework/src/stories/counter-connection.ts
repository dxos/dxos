//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import * as Client from '@dxos/worker-framework/Client';
import * as Coordinator from '@dxos/worker-framework/Coordinator';

import * as Rpc from '../internal/rpc';
import { COUNTER_LEADER_LOCK_KEY } from './counter-constants';
import { CounterClientRpcs, CounterRpcs, type TimingStatsSnapshot } from './counter-service';

export type CounterRpc = {
  increment: () => Effect.Effect<number>;
  subscribe: (input: Record<string, never>) => Stream.Stream<number>;
  ping: (input: Record<string, never>) => Effect.Effect<void>;
  getTimingStats: (input: Record<string, never>) => Effect.Effect<TimingStatsSnapshot>;
  blockCpu: (input: { durationMs: number }) => Effect.Effect<number>;
};

export type CounterSessionInfo = {
  clientId: string;
  leaderId: string;
  isOwner: boolean;
};

export type PingMeasurement = {
  readonly rttMs: number;
  readonly queueWaitMs: number | undefined;
  readonly serviceMs: number;
  readonly at: number;
};

/**
 * Client-side connection to the shared counter worker via {@link Client.Connection}.
 */
export class CounterConnection extends Resource {
  readonly #connection: Client.Connection;
  #scope: Scope.CloseableScope | undefined;
  #rpc: CounterRpc | undefined;
  readonly #subscribeCleanups = new Set<() => Promise<void>>();
  #sessionInfo: CounterSessionInfo | undefined;

  readonly sessionChanged = new Event<CounterSessionInfo>();
  readonly pingUpdated = new Event<PingMeasurement>();

  constructor() {
    super();
    this.#connection = new Client.Connection({
      createWorker: () => new Worker(new URL('./counter-worker.ts', import.meta.url), { type: 'module' }),
      createCoordinator: () =>
        new Coordinator.SharedWorker({
          createWorker: () =>
            new SharedWorker(new URL('./coordinator-worker.ts', import.meta.url), {
              type: 'module',
              name: 'worker-framework-counter-coordinator',
            }),
        }),
      leaderLockKey: COUNTER_LEADER_LOCK_KEY,
      onConnect: async ({ clientToWorker, workerToClient, leaderId, isOwner }) => {
        invariant(this.#scope, 'counter rpc scope not initialized');
        this.#sessionInfo = { clientId: this.#connection.clientId, leaderId, isOwner };
        this.sessionChanged.emit(this.#sessionInfo);

        // The framework provisions both directions per session. Serve the (empty) worker→client
        // channel so the worker's worker→client protocol handshake completes; open it before the
        // client so the worker's session protocols finish building and can dispatch our requests.
        const clientServer = Rpc.serve(
          workerToClient,
          CounterClientRpcs,
          CounterClientRpcs.toLayer(Effect.succeed({})),
        );
        await clientServer.open();

        this.#rpc = (await EffectEx.runPromise(
          Rpc.makeClient(clientToWorker, CounterRpcs, { timing: { minLogMs: 20 } }).pipe(Scope.extend(this.#scope)),
        )) as CounterRpc;
        return {
          close: async () => {
            this.#rpc = undefined;
            await clientServer.close();
          },
        };
      },
    });
  }

  get rpc(): CounterRpc {
    invariant(this.#rpc, 'counter rpc not connected');
    return this.#rpc;
  }

  /**
   * Fires after the connection fails over to a freshly-elected leader (and its re-created worker).
   */
  get reconnected(): Client.Connection['reconnected'] {
    return this.#connection.reconnected;
  }

  get sessionInfo(): CounterSessionInfo | undefined {
    return this.#sessionInfo;
  }

  get clientId(): string {
    return this.#connection.clientId;
  }

  onReconnect = (callback: () => Promise<void>): void => {
    this.#connection.onReconnect(callback);
  };

  override async _open(): Promise<void> {
    this.#scope = Effect.runSync(Scope.make());
    await this.#connection.open();
  }

  override async _close(): Promise<void> {
    await Promise.all([...this.#subscribeCleanups].map((cleanup) => cleanup()));
    this.#subscribeCleanups.clear();
    await this.#connection.close();
    if (this.#scope) {
      await EffectEx.runPromise(Scope.close(this.#scope, Exit.void));
      this.#scope = undefined;
    }
    this.#rpc = undefined;
    this.#sessionInfo = undefined;
  }

  increment = async (): Promise<number> => EffectEx.runPromise(this.rpc.increment());

  ping = async (): Promise<PingMeasurement> => {
    const sentAt = Date.now();
    await EffectEx.runPromise(this.rpc.ping({}));
    const stats = await this.getTimingStats();
    const lastPing = [...stats.samples].reverse().find((sample) => sample.tag === 'ping');
    const measurement: PingMeasurement = {
      rttMs: Math.max(0, Date.now() - sentAt),
      queueWaitMs: lastPing?.queueWaitMs,
      serviceMs: lastPing?.serviceMs ?? 0,
      at: sentAt,
    };
    this.pingUpdated.emit(measurement);
    return measurement;
  };

  getTimingStats = async (): Promise<TimingStatsSnapshot> => EffectEx.runPromise(this.rpc.getTimingStats({}));

  blockCpu = async (durationMs: number): Promise<number> => EffectEx.runPromise(this.rpc.blockCpu({ durationMs }));

  /**
   * Subscribes to counter updates. Returns cleanup that interrupts only this subscription.
   */
  subscribe = (onValue: (value: number) => void): (() => Promise<void>) => {
    invariant(this.#rpc, 'counter rpc not connected');
    const fiber = Effect.runFork(
      this.rpc.subscribe({}).pipe(Stream.runForEach((value) => Effect.sync(() => onValue(value)))),
    );
    const cleanup = async () => {
      await EffectEx.runPromise(Fiber.interrupt(fiber));
    };
    this.#subscribeCleanups.add(cleanup);
    return async () => {
      await cleanup();
      this.#subscribeCleanups.delete(cleanup);
    };
  };
}
