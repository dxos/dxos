//
// Copyright 2023 DXOS.org
//

import { Event, Trigger, synchronized } from '@dxos/async';
import { type ClientServices, type ClientServicesProvider, clientServiceBundle } from '@dxos/client-protocol';
import { WorkerProxyRuntime } from '@dxos/client-services';
import { type Config } from '@dxos/config';
import { type PublicKey } from '@dxos/keys';
import { type ServiceBundle } from '@dxos/rpc';
import { createWorkerPort } from '@dxos/rpc-tunnel';

import { IFrameManager } from './iframe-manager';
import { ClientServicesProxy } from './service-proxy';
import { ShellManager } from './shell-manager';

/**
 * Proxy to host client service in worker.
 */
// TODO(wittjosiah): Reconcile with existing ClientServicesProvider implementations.
export class WorkerClientServices implements ClientServicesProvider {
  readonly joinedSpace = new Event<PublicKey>();

  private _isOpen = false;
  private readonly _config: Config;
  private readonly _createWorker: () => SharedWorker;

  private _runtime!: WorkerProxyRuntime;
  private _services!: ClientServicesProxy;
  private _iframeManager?: IFrameManager;
  private _shellManager?: ShellManager;

  constructor({
    config,
    createWorker,
    shell = true,
  }: {
    config: Config;
    createWorker: () => SharedWorker;
    shell?: boolean;
  }) {
    this._config = config;
    this._createWorker = createWorker;
    this._iframeManager = shell
      ? new IFrameManager({ source: new URL('/shell.html', window.location.origin) })
      : undefined;
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get runtime(): WorkerProxyRuntime {
    return this._runtime;
  }

  get services(): Partial<ClientServices> {
    return this._services.services;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    console.log('a', this._iframeManager);
    await this._iframeManager?.open();
    console.log('b');

    const ports = new Trigger<{ systemPort: MessagePort; appPort: MessagePort }>();
    const worker = this._createWorker();
    worker.port.onmessage = (event) => {
      const { command, payload } = event.data;
      if (command === 'init') {
        ports.wake(payload);
      }
    };

    console.log('c', worker);
    const { systemPort, appPort } = await ports.wait();
    console.log('d');

    this._runtime = new WorkerProxyRuntime({
      config: this._config,
      systemPort: createWorkerPort({ port: systemPort }),
    });

    this._services = new ClientServicesProxy(createWorkerPort({ port: appPort }));
    console.log('e', this._services);
    await this._services.open();

    // TODO(wittjosiah): Forward worker logs.

    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager, this.joinedSpace) : undefined;
    console.log('f', this._shellManager);
    await this._shellManager?.open();
    console.log('g');

    this._isOpen = true;
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._shellManager?.close();
    this._shellManager = undefined;
    await this._iframeManager?.close();
    this._iframeManager = undefined;
    await this._services.close();
    await this._runtime.close();
    this._isOpen = false;
  }
}
