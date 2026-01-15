//
// Copyright 2022 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import type * as SqlClient from '@effect/sql/SqlClient';
import * as OpfsWorker from '@effect/sql-sqlite-wasm/OpfsWorker';
import * as SqliteClient from '@effect/sql-sqlite-wasm/SqliteClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Trigger } from '@dxos/async';
import { DEFAULT_WORKER_BROADCAST_CHANNEL } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import {
  MemorySignalManager,
  MemorySignalManagerContext,
  WebsocketSignalManager,
  setIdentityTags,
} from '@dxos/messaging';
import { RtcTransportProxyFactory } from '@dxos/network-manager';
import { type RpcPort } from '@dxos/rpc';
import { type MaybePromise } from '@dxos/util';

import { ClientServicesHost } from '../services';

import { WorkerSession } from './worker-session';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type CreateSessionProps = {
  appPort: RpcPort;
  systemPort: RpcPort;
  shellPort?: RpcPort;
};

export type WorkerRuntimeOptions = {
  channel?: string;
  configProvider: () => MaybePromise<Config>;
  acquireLock: () => Promise<void>;
  releaseLock: () => void;
  onStop?: () => Promise<void>;
  /**
   * @default false
   */
  automaticallyConnectWebrtc?: boolean;
};

/**
 * Runtime for the shared and dedciated worker.
 * Manages connections from proxies (in tabs).
 * Tabs make requests to the `ClientServicesHost`, and provide a WebRTC gateway.
 */
export class WorkerRuntime {
  private readonly _configProvider: () => MaybePromise<Config>;
  private readonly _acquireLock: () => Promise<void>;
  private readonly _releaseLock: () => void;
  private readonly _onStop?: () => Promise<void>;
  private readonly _transportFactory = new RtcTransportProxyFactory();
  private readonly _ready = new Trigger<Error | undefined>();
  private readonly _sessions = new Set<WorkerSession>();
  private readonly _clientServices!: ClientServicesHost;
  private readonly _channel: string;
  private readonly _automaticallyConnectWebrtc: boolean;
  private _broadcastChannel?: BroadcastChannel;
  private _sessionForNetworking?: WorkerSession; // TODO(burdon): Expose to client QueryStatusResponse.
  private _config!: Config;
  private _signalMetadataTags: any = { runtime: 'worker-runtime' };
  private _signalTelemetryEnabled: boolean = false;
  private _runtime!: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;

  constructor({
    channel = DEFAULT_WORKER_BROADCAST_CHANNEL,
    configProvider,
    acquireLock,
    releaseLock,
    onStop,
    automaticallyConnectWebrtc = true,
  }: WorkerRuntimeOptions) {
    this._configProvider = configProvider;
    this._acquireLock = acquireLock;
    this._releaseLock = releaseLock;
    this._onStop = onStop;
    this._channel = channel;
    this._runtime = ManagedRuntime.make(Layer.merge(LocalSqliteOpfsLayer, Reactivity.layer).pipe(Layer.orDie));
    this._clientServices = new ClientServicesHost({
      callbacks: {
        onReset: async () => this.stop(),
      },
      runtime: this._runtime.runtimeEffect,
    });
    this._automaticallyConnectWebrtc = automaticallyConnectWebrtc;
  }

  get host() {
    return this._clientServices;
  }

  async start(): Promise<void> {
    log('starting...');
    try {
      this._broadcastChannel = new BroadcastChannel(this._channel);
      this._broadcastChannel.postMessage({ action: 'stop' });
      this._broadcastChannel.onmessage = async (event) => {
        if (event.data?.action === 'stop') {
          await this.stop();
        }
      };

      await this._acquireLock();
      this._config = await this._configProvider();
      const signals = this._config.get('runtime.services.signaling');
      this._clientServices.initialize({
        config: this._config,
        signalManager: this._config.get('runtime.client.edgeFeatures')?.signaling
          ? undefined
          : signals
            ? new WebsocketSignalManager(signals, () => (this._signalTelemetryEnabled ? this._signalMetadataTags : {}))
            : new MemorySignalManager(new MemorySignalManagerContext()), // TODO(dmaretskyi): Inject this context.
        transportFactory: this._transportFactory,
      });

      await this._clientServices.open(new Context());
      this._ready.wake(undefined);
      log('started');
      setIdentityTags({
        identityService: this._clientServices.services.IdentityService!,
        devicesService: this._clientServices.services.DevicesService!,
        setTag: (k: string, v: string) => {
          this._signalMetadataTags[k] = v;
        },
      });
    } catch (err: any) {
      this._ready.wake(err);
      log.error('starting', err);
    }
  }

  async stop(): Promise<void> {
    // Release the lock to notify remote clients that the worker is terminating.
    this._releaseLock();
    this._broadcastChannel?.close();
    this._broadcastChannel = undefined;
    await this._clientServices.close();
    await this._runtime.dispose();
    await this._onStop?.();
  }

  /**
   * Create a new session.
   */
  async createSession({ appPort, systemPort, shellPort }: CreateSessionProps): Promise<WorkerSession> {
    const session = new WorkerSession({
      serviceHost: this._clientServices,
      appPort,
      systemPort,
      shellPort,
      readySignal: this._ready,
    });

    // When tab is closed or client is destroyed.
    session.onClose.set(async () => {
      this._sessions.delete(session);
      if (this._sessions.size === 0) {
        // Terminate the worker when all sessions are closed.
        await this.stop();
      } else {
        if (this._automaticallyConnectWebrtc) {
          this._reconnectWebrtc();
        }
      }
    });

    await session.open();
    // A worker can only service one origin currently
    invariant(
      !this._signalMetadataTags.origin || this._signalMetadataTags.origin === session.origin,
      `worker origin changed from ${this._signalMetadataTags.origin} to ${session.origin}?`,
    );
    if (session.observabilityGroup) {
      this._signalMetadataTags.group = session.observabilityGroup;
    }
    this._signalTelemetryEnabled = session.signalTelemetryEnabled ?? false;
    this._signalMetadataTags.origin = session.origin;
    this._sessions.add(session);

    if (this._automaticallyConnectWebrtc) {
      this._reconnectWebrtc();
    }

    return session;
  }

  /**
   * Connects the WebRTC bridge to the specified session.
   * If no session is provided, disconnects the WebRTC bridge.
   *
   * Called automatically if `automaticallyConnectWebrtc` is true.
   *
   * @param session The session to connect the WebRTC bridge to.
   */
  connectWebrtcBridge(session: WorkerSession | undefined): void {
    this._sessionForNetworking = session;
    this._transportFactory.setBridgeService(session?.bridgeService);
  }

  /**
   * Selects one of the existing session for WebRTC networking.
   */
  private _reconnectWebrtc(): void {
    log('reconnecting webrtc...');
    // Check if current session is already closed.
    if (this._sessionForNetworking) {
      if (!this._sessions.has(this._sessionForNetworking)) {
        this._sessionForNetworking = undefined;
      }
    }

    // Select existing session.
    if (!this._sessionForNetworking) {
      const selected = Array.from(this._sessions).find((session) => session.bridgeService);
      this.connectWebrtcBridge(selected);
    }
  }
}

const DB_NAME = 'DXOS';
/**
 * Local SQLite layer for the worker.
 * Uses OPFS sync API as an FS backend.
 * Does NOT spawn a new worker.
 * NOTE: Only usable within a worker.
 * TODO(mykola): This does not work right now. Fix.
 */
const LocalSqliteOpfsLayer = Layer.unwrapScoped(
  Effect.gen(function* () {
    const { port1: clientPort, port2: serverPort } = new MessageChannel();
    clientPort.start();
    serverPort.start();
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        clientPort.close();
        serverPort.close();
      }),
    );

    yield* Effect.forkScoped(OpfsWorker.run({ port: serverPort, dbName: DB_NAME }));
    return SqliteClient.layer({ worker: Effect.succeed(clientPort) });
  }),
);
