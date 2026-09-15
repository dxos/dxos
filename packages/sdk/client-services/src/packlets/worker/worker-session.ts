//
// Copyright 2022 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';
import type * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { Trigger } from '@dxos/async';
import {
  ClientRpcServer,
  type ClientServicesHandlers,
  PROXY_CONNECTION_TIMEOUT,
  makeBridgeServiceClientOverProtocol,
} from '@dxos/client-protocol';
import { Event } from '@dxos/effect';
import { log, logInfo } from '@dxos/log';
import { type BufService } from '@dxos/protocols/buf-service';
import { BridgeService as BridgeServiceDesc } from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import { type WorkerService } from '@dxos/protocols/rpc';

import { SessionClosed } from './events.ts';

type BridgeService = BufService<typeof BridgeServiceDesc>;

export type WorkerSessionProps = {
  /** The client services handlers the runtime currently serves; read per request since they change with the stack. */
  services: () => Partial<ClientServicesHandlers>;
  /** The runtime's bus; the session emits {@link SessionClosed} on it. */
  bus: Event.BusService;
  /**
   * Reverse-direction (worker→tab) protocol serving the tab's {@link BridgeService} (WebRTC transport)
   * over effect-rpc. The worker is the client; the tab is the runner.
   */
  systemProtocol: RpcClient.Protocol['Service'];
  /**
   * Forward-direction (tab→worker) protocol over which the worker serves the client services.
   */
  appProtocol: RpcServer.Protocol['Service'];
  // TODO(wittjosiah): Remove shellPort.
  shellPort?: MessagePort;
  readySignal: Trigger<Error | undefined>;
};

/**
 * Represents a tab connection within the worker.
 *
 * The session holds imperative per-connection transport state (RPC servers, the WebRTC bridge client);
 * its lifecycle is driven by {@link WorkerRuntime} through the {@link open} / {@link close} Effects.
 */
export class WorkerSession {
  private readonly _clientRpc: ClientRpcServer;
  private readonly _shellClientRpc?: ClientRpcServer;
  private readonly _startTrigger = new Trigger();
  private readonly _systemProtocol: RpcClient.Protocol['Service'];
  readonly #bus: Event.BusService;
  #closeBridge?: () => Promise<void>;

  @logInfo
  public origin?: string;

  @logInfo
  public lockKey?: string;

  public bridgeService?: BridgeService;

  // Per-session `WorkerService` control handlers, served over the app port alongside the client
  // services (both run tab→worker). `start` conveys the tab origin / liveness lock and releases the
  // gate below; `stop` tears the session down.
  readonly #workerServiceHandlers: WorkerService.Handlers = {
    'WorkerService.start': (payload) =>
      Effect.sync(() => {
        this.origin = payload.origin;
        this.lockKey = payload.lockKey;
        this._startTrigger.wake();
      }),
    'WorkerService.stop': () =>
      // Close on the next tick (forked) so the RPC response is delivered before the transport tears down.
      Effect.forkDetach(
        Effect.gen({ self: this }, function* () {
          yield* Effect.callback<void>((resume) => {
            setTimeout(() => resume(Effect.void));
          });
          yield* this.close();
        }).pipe(Effect.tapCause((cause) => Effect.sync(() => log.catch(cause)))),
      ).pipe(Effect.asVoid),
  };

  constructor({
    services: runtimeServices,
    bus,
    systemProtocol,
    appProtocol,
    shellPort,
    readySignal,
  }: WorkerSessionProps) {
    this._systemProtocol = systemProtocol;
    this.#bus = bus;

    // Hold requests until the worker runtime is ready; propagate startup errors to callers.
    const onRequest = async () => {
      const error = await readySignal.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
      if (error) {
        throw error;
      }
    };

    const services = () => ({
      ...runtimeServices(),
      WorkerService: this.#workerServiceHandlers,
    });

    this._clientRpc = new ClientRpcServer({
      services,
      protocol: appProtocol,
      onRequest,
    });

    this._shellClientRpc = shellPort
      ? new ClientRpcServer({
          services,
          port: shellPort,
          onRequest,
        })
      : undefined;
  }

  open(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      log('opening...');
      // The tab serves the WebRTC `BridgeService` on the reverse channel; build a client the worker's
      // network stack can proxy through.
      const { bridgeService, close } = yield* Effect.promise(() =>
        makeBridgeServiceClientOverProtocol(this._systemProtocol),
      );
      this.bridgeService = bridgeService;
      this.#closeBridge = close;

      yield* Effect.all([Effect.promise(() => this._clientRpc.open()), this.#maybeOpenShell()], {
        concurrency: 'unbounded',
      });

      // Wait until the tab calls `WorkerService.start` (conveys origin + liveness lock).
      yield* Effect.promise(() => this._startTrigger.wait({ timeout: PROXY_CONNECTION_TIMEOUT }));

      if (this.lockKey) {
        yield* Effect.forkDetach(
          this.#afterLockReleases(this.lockKey).pipe(
            Effect.andThen(this.close()),
            Effect.tapCause((cause) => Effect.sync(() => log.catch(cause))),
          ),
        );
      }

      log('opened');
    });
  }

  close(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      log.debug('closing...');
      // A subscriber failing must not keep the transport open.
      yield* Event.emit(SessionClosed, { session: this }).pipe(
        Effect.catchCause((cause) => Effect.sync(() => log.catch(cause))),
      );

      yield* Effect.promise(() =>
        Promise.all([this._clientRpc.close(), this._shellClientRpc?.close(), this.#closeBridge?.()]),
      );
      this.bridgeService = undefined;
      this.#closeBridge = undefined;
      log.debug('closed');
    }).pipe(Effect.provideService(Event.Bus, this.#bus));
  }

  #maybeOpenShell(): Effect.Effect<void> {
    const shell = this._shellClientRpc;
    if (!shell) {
      return Effect.void;
    }
    return Effect.tryPromise(() => shell.open()).pipe(
      Effect.catch(() => Effect.sync(() => log.info('No shell connected.'))),
    );
  }

  /** Resolves once the tab's liveness lock is released, i.e. the tab is gone. */
  #afterLockReleases(lockKey: string): Effect.Effect<void> {
    return Effect.promise(() =>
      navigator.locks.request(lockKey, () => {
        // No-op.
      }),
    );
  }
}
