//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, synchronized, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  Space,
  STATUS_TIMEOUT,
} from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import type { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ModelFactory } from '@dxos/model-factory';
import { trace } from '@dxos/protocols';
import {
  GetDiagnosticsRequest,
  Invitation,
  SystemStatus,
  QueryStatusResponse,
} from '@dxos/protocols/proto/dxos/client/services';
import { isNode, jsonKeyReplacer, JsonKeyOptions, MaybePromise } from '@dxos/util';

import type { EchoProxy } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';
import type { PropertiesProps } from '../proto';
import { DXOS_VERSION } from '../version';
import { ClientRuntime } from './client-runtime';

// TODO(burdon): Define package-specific errors.

/**
 * This options object configures the DXOS Client
 */
export type ClientOptions = {
  /** client configuration object */
  config?: Config;
  /** custom services provider */
  services?: MaybePromise<ClientServicesProvider>;
  /** custom model factory */
  modelFactory?: ModelFactory;
};

/**
 * The Client class encapsulates the core client-side API of DXOS.
 */
export class Client {
  /**
   * The version of this client API
   */
  public readonly version = DXOS_VERSION;

  private readonly _options: ClientOptions;
  private _config?: Config;
  private _services?: ClientServicesProvider;
  private _runtime?: ClientRuntime;
  // TODO(wittjosiah): Make `null` status part of enum.
  private readonly _statusUpdate = new Event<SystemStatus | null>();

  private _initialized = false;
  private _statusStream?: Stream<QueryStatusResponse>;
  private _statusTimeout?: NodeJS.Timeout;
  private _status = MulticastObservable.from(this._statusUpdate, null);

  /**
   * Unique id of the Client, local to the current peer.
   */
  private readonly _instanceId = PublicKey.random().toHex();
  constructor(options: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      !window.location.hostname.endsWith('localhost')
    ) {
      console.warn(
        `DXOS Client will not function in a non-secure context ${window.location.origin}. Either serve with a certificate or use a tunneling service (https://docs.dxos.org/guide/kube/tunneling.html).`,
      );
    }

    this._options = options;

    // TODO(wittjosiah): Reconcile this with @dxos/log loading config from localStorage.
    const filter = options.config?.get('runtime.client.log.filter');
    if (filter) {
      const prefix = options.config?.get('runtime.client.log.prefix');
      log.config({ filter, prefix });
    }
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      initialized: this.initialized,
      echo: this._runtime?.echo,
      halo: this._runtime?.halo,
      mesh: this._runtime?.mesh,
    };
  }

  /**
   * Current configuration object
   */
  get config(): Config {
    invariant(this._config, 'Client not initialized.');
    return this._config;
  }

  /**
   * Current client services provider.
   */
  get services(): ClientServicesProvider {
    invariant(this._services, 'Client not initialized.');
    return this._services;
  }

  // TODO(burdon): Rename isOpen.
  /**
   * Returns true if the client has been initialized. Initialize by calling `.initialize()`
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * Client services system status.
   */
  get status(): MulticastObservable<SystemStatus | null> {
    return this._status;
  }

  private get _echo(): EchoProxy {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.echo;
  }

  /**
   * HALO credentials.
   */
  get halo(): HaloProxy {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.halo;
  }

  /**
   * MESH networking.
   */
  get mesh(): MeshProxy {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.mesh;
  }

  /**
   * @deprecated
   */
  get dbRouter(): DatabaseRouter {
    return this._echo.dbRouter;
  }

  addSchema(schema: EchoSchema): void {
    return this._echo.addSchema(schema);
  }

  /**
   * ECHO spaces.
   */
  get spaces(): MulticastObservable<Space[]> {
    return this._echo.spaces;
  }

  /**
   * Get an existing space by its key.
   */
  getSpace(spaceKey: PublicKey): Space | undefined {
    return this._echo.getSpace(spaceKey);
  }

  /**
   * Creates a new space.
   */
  createSpace(meta?: PropertiesProps): Promise<Space> {
    return this._echo.createSpace(meta);
  }

  /**
   * Accept an invitation to a space.
   */
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable {
    return this._echo.acceptInvitation(invitation);
  }

  /**
   * Get client diagnostics data.
   */
  // TODO(burdon): Pass options to query.
  async diagnostics(options: JsonKeyOptions = {}): Promise<any> {
    invariant(this._services?.services.SystemService, 'SystemService is not available.');
    const data = await this._services.services.SystemService.getDiagnostics({
      keys: options.truncate
        ? GetDiagnosticsRequest.KEY_OPTION.HUMANIZE
        : options.truncate
        ? GetDiagnosticsRequest.KEY_OPTION.TRUNCATE
        : undefined,
    });
    return JSON.parse(JSON.stringify(data, jsonKeyReplacer(options)));
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  async initialize() {
    if (this._initialized) {
      return;
    }

    log.trace('dxos.sdk.client.open', trace.begin({ id: this._instanceId }));

    const { fromHost, fromIFrame } = await import('../services');
    const { EchoProxy, createDefaultModelFactory } = await import('../echo');
    const { HaloProxy } = await import('../halo');
    const { MeshProxy } = await import('../mesh');

    this._config = this._options.config ?? new Config();
    // NOTE: Must currently match the host.
    const modelFactory = this._options.modelFactory ?? createDefaultModelFactory();
    this._services = await (this._options.services ?? (isNode() ? fromHost(this._config) : fromIFrame(this._config)));
    const echo = new EchoProxy(this._services, modelFactory, this._instanceId);
    const halo = new HaloProxy(this._services, this._instanceId);
    const mesh = new MeshProxy(this._services, this._instanceId);
    this._runtime = new ClientRuntime({ echo, halo, mesh });

    await this._services.open();

    // TODO(burdon): Remove?
    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      const { createDevtoolsRpcServer } = await import('../devtools');
      await createDevtoolsRpcServer(this, this._services);
    }

    const trigger = new Trigger<Error | undefined>();
    invariant(this._services.services.SystemService, 'SystemService is not available.');
    this._statusStream = this._services.services.SystemService.queryStatus({ interval: 3_000 });
    this._statusStream.subscribe(
      async ({ status }) => {
        this._statusTimeout && clearTimeout(this._statusTimeout);
        trigger.wake(undefined);

        this._statusUpdate.emit(status);
        this._statusTimeout = setTimeout(() => {
          this._statusUpdate.emit(null);
        }, STATUS_TIMEOUT);
      },
      (err) => {
        trigger.wake(err);
        this._statusUpdate.emit(null);
      },
    );

    const err = await trigger.wait();
    if (err) {
      throw err;
    }

    await this._runtime.open();

    this._initialized = true;
    log.trace('dxos.sdk.client.open', trace.end({ id: this._instanceId }));
  }

  /**
   * Cleanup, release resources.
   * Open/close is re-entrant.
   */
  @synchronized
  async destroy() {
    if (!this._initialized) {
      return;
    }

    await this._runtime!.close();

    this._statusTimeout && clearTimeout(this._statusTimeout);
    this._statusStream!.close();
    await this.services.close();

    this._initialized = false;
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    invariant(this.services.services.SystemService, 'SystemService is not available.');
    await this.services.services.SystemService.updateStatus({ status: SystemStatus.ACTIVE });
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  async reset() {
    if (!this._initialized) {
      throw new ApiError('Client not open.');
    }

    invariant(this.services.services.SystemService, 'SystemService is not available.');
    await this.services.services?.SystemService.reset();
    await this.destroy();
    // this._halo.identityChanged.emit(); // TODO(burdon): Triggers failure in hook.
    this._initialized = false;
  }
}
