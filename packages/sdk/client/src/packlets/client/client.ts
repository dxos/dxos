//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, synchronized, Trigger } from '@dxos/async';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Invitation, SystemStatus, SystemStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { TextModel } from '@dxos/text-model';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { AuthenticatingInvitationObservable, InvitationsOptions } from '../invitations';
import { PropertiesProps } from '../proto';
import { EchoProxy, HaloProxy, MeshProxy, Space } from '../proxies';
import { Observable } from '../util';
import { SpaceSerializer } from './serializer';
import { ClientServicesProvider } from './service-definitions';
import { fromIFrame } from './utils';

// TODO(burdon): Define package-specific errors.

// TODO(burdon): Factor out to spaces.
// TODO(burdon): Defaults (with TextModel).
export const createDefaultModelFactory = () => {
  return new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);
};

/**
 * This options object configures the DXOS Client
 */
export type ClientOptions = {
  /** client configuration object */
  config?: Config;
  /** custom services provider */
  services?: ClientServicesProvider;
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

  private readonly _config: Config;
  private readonly _modelFactory: ModelFactory;
  private readonly _services: ClientServicesProvider;
  private readonly _halo: HaloProxy;
  private readonly _echo: EchoProxy;
  private readonly _mesh: MeshProxy;
  private readonly _statusUpdate = new Event<SystemStatus | undefined>();

  private _initialized = false;
  private _statusStream?: Stream<SystemStatusResponse>;
  private _statusTimeout?: NodeJS.Timeout;
  private _status = new Observable<SystemStatus | undefined>(undefined, this._statusUpdate);

  // prettier-ignore
  constructor({
    config,
    modelFactory,
    services
  }: ClientOptions = {}) {
    this._config = config ?? new Config();
    // TODO(wittjosiah): Useful default when not in browser?
    this._services = services ?? fromIFrame(this._config);

    // NOTE: Must currently match the host.
    this._modelFactory = modelFactory ?? createDefaultModelFactory();

    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory, this._halo);
    this._mesh = new MeshProxy(this._services);

    // TODO(wittjosiah): Reconcile this with @dxos/log loading config from localStorage.
    const filter = this.config.get('runtime.client.log.filter');
    if (filter) {
      const prefix = this.config.get('runtime.client.log.prefix');
      log.config({ filter, prefix });
    }
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      initialized: this.initialized,
      echo: this._echo,
      halo: this._halo,
      mesh: this._mesh
    };
  }

  /**
   * Current configuration object
   */
  get config(): Config {
    return this._config;
  }

  /**
   * Current client services provider.
   */
  get services(): ClientServicesProvider {
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
  get status(): Observable<SystemStatus | undefined> {
    return this._status;
  }

  /**
   * HALO credentials.
   */
  get halo(): HaloProxy {
    return this._halo;
  }

  /**
   * Client network status.
   */
  get mesh(): MeshProxy {
    return this._mesh;
  }

  /**
   * @deprecated
   */
  get dbRouter(): DatabaseRouter {
    return this._echo.dbRouter;
  }

  /**
   * ECHO spaces.
   */
  get spaces(): Observable<Space[]> {
    return this._echo.spaces;
  }

  addSchema(schema: EchoSchema): void {
    return this._echo.addSchema(schema);
  }

  /**
   * Creates a new space.
   */
  createSpace(meta?: PropertiesProps): Promise<Space> {
    return this._echo.createSpace(meta);
  }

  /**
   * Get an existing space by its key.
   */
  getSpace(spaceKey: PublicKey): Space | undefined {
    return this._echo.getSpace(spaceKey);
  }

  /**
   * Accept an invitation to a space.
   */
  acceptInvitation(invitation: Invitation, options?: InvitationsOptions): AuthenticatingInvitationObservable {
    return this._echo.acceptInvitation(invitation, options);
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

    await this._services.open();

    // TODO(burdon): Remove?
    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._services);
    }

    assert(this._services.services.SystemService, 'SystemService is not available.');

    const trigger = new Trigger<Error | undefined>();
    this._statusStream = this._services.services.SystemService.queryStatus();
    this._statusStream.subscribe(
      async ({ status }) => {
        this._statusTimeout && clearTimeout(this._statusTimeout);
        trigger.wake(undefined);

        this._statusUpdate.emit(status);

        this._statusTimeout = setTimeout(() => {
          this._statusUpdate.emit(undefined);
        }, 5000);
      },
      (err) => {
        trigger.wake(err);
        this._statusUpdate.emit(undefined);
      }
    );

    const err = await trigger.wait();
    if (err) {
      throw err;
    }

    // TODO(wittjosiah): Promise.all?
    await this._halo._open();
    await this._echo.open();
    await this._mesh._open();

    this._initialized = true;
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

    await this._halo._close();
    await this._echo.close();
    await this._mesh._close();

    this._statusTimeout && clearTimeout(this._statusTimeout);
    this._statusStream!.close();
    await this._services.close();

    this._initialized = false;
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    assert(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services.SystemService.updateStatus({ status: SystemStatus.ACTIVE });
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  async reset() {
    if (!this._initialized) {
      throw new ApiError('Client not open.');
    }

    assert(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services?.SystemService.reset();
    await this.destroy();
    // this._halo.identityChanged.emit(); // TODO(burdon): Triggers failure in hook.
    this._initialized = false;
  }

  /**
   * @deprecated
   */
  createSerializer() {
    return new SpaceSerializer(this._echo);
  }
}
