//
// Copyright 2022 DXOS.org
//

import type * as RpcClient from '@effect/rpc/RpcClient';
import type * as RpcServer from '@effect/rpc/RpcServer';
import * as Effect from 'effect/Effect';

import { Trigger } from '@dxos/async';
import { ClientRpcServer, PROXY_CONNECTION_TIMEOUT, makeBridgeServiceClientOverProtocol } from '@dxos/client-protocol';
import { EffectEx } from '@dxos/effect';
import { log, logInfo } from '@dxos/log';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type WorkerService } from '@dxos/protocols/rpc';
import { Callback, type MaybePromise } from '@dxos/util';

import { type ClientServicesHost } from '../services';

export type WorkerSessionProps = {
  serviceHost: ClientServicesHost;
  /**
   * Reverse-direction (worker→tab) protocol serving the tab's {@link BridgeService} (WebRTC transport)
   * over effect-rpc. The worker is the client; the tab is the runner.
   */
  systemProtocol: RpcClient.Protocol['Type'];
  /**
   * Forward-direction (tab→worker) protocol over which the worker serves the client services.
   */
  appProtocol: RpcServer.Protocol['Type'];
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
  private readonly _serviceHost: ClientServicesHost;
  private readonly _systemProtocol: RpcClient.Protocol['Type'];
  #closeBridge?: () => Promise<void>;

  public readonly onClose = new Callback<() => Promise<void>>();

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
      Effect.sync(() => {
        // Close on the next tick so the RPC response is delivered before the transport tears down.
        setTimeout(() => {
          void EffectEx.runPromise(this.close()).catch((err) => log.catch(err));
        });
      }),
  };

  constructor({ serviceHost, systemProtocol, appProtocol, shellPort, readySignal }: WorkerSessionProps) {
    this._serviceHost = serviceHost;
    this._systemProtocol = systemProtocol;

    // Hold requests until the worker runtime is ready; propagate startup errors to callers.
    const onRequest = async () => {
      const error = await readySignal.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
      if (error) {
        throw error;
      }
    };

    const services = () => ({
      ...this._serviceHost.services,
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
    return Effect.promise(async () => {
      log('opening...');
      // The tab serves the WebRTC `BridgeService` on the reverse channel; build a client the worker's
      // network stack can proxy through.
      const { bridgeService, close } = await makeBridgeServiceClientOverProtocol(this._systemProtocol);
      this.bridgeService = bridgeService;
      this.#closeBridge = close;

      await Promise.all([this._clientRpc.open(), this._maybeOpenShell()]);

      // Wait until the tab calls `WorkerService.start` (conveys origin + liveness lock).
      await this._startTrigger.wait({ timeout: PROXY_CONNECTION_TIMEOUT });

      if (this.lockKey) {
        void this._afterLockReleases(this.lockKey, () =>
          EffectEx.runPromise(this.close()).catch((err) => log.catch(err)),
        );
      }

      log('opened');
    });
  }

  close(): Effect.Effect<void> {
    return Effect.promise(async () => {
      log.debug('closing...');
      try {
        await this.onClose.callIfSet();
      } catch (err: any) {
        log.catch(err);
      }

      await Promise.all([this._clientRpc.close(), this._shellClientRpc?.close(), this.#closeBridge?.()]);
      this.bridgeService = undefined;
      this.#closeBridge = undefined;
      log.debug('closed');
    });
  }

  private async _maybeOpenShell(): Promise<void> {
    try {
      this._shellClientRpc && (await this._shellClientRpc.open());
    } catch {
      log.info('No shell connected.');
    }
  }

  private _afterLockReleases(lockKey: string, callback: () => MaybePromise<void>): Promise<void> {
    return navigator.locks
      .request(lockKey, () => {
        // No-op.
      })
      .then(callback);
  }
}
