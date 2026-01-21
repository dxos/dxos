//
// Copyright 2021 DXOS.org
//

import { Event, MulticastObservable, SubscriptionList } from '@dxos/async';
import { type ClientServicesProvider } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { ConnectionState, type NetworkStatus } from '@dxos/protocols/proto/dxos/client/services';

import { RPC_TIMEOUT } from '../common';

/**
 * Public API for MESH services.
 */
export class MeshProxy {
  private readonly _networkStatusUpdated = new Event<NetworkStatus>();
  private readonly _networkStatus = MulticastObservable.from(this._networkStatusUpdated, {
    swarm: ConnectionState.OFFLINE,
    signaling: [],
  });

  /** Subscriptions for RPC streams that need to be re-established on reconnect. */
  private readonly _streamSubscriptions = new SubscriptionList();

  private readonly _instanceId = PublicKey.random().toHex();

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    /**
     * @internal
     */
    public _traceParent?: string,
  ) {}

  toJSON(): { networkStatus: NetworkStatus } {
    return {
      networkStatus: this._networkStatus.get(),
    };
  }

  get networkStatus() {
    return this._networkStatus;
  }

  async updateConfig(swarm: ConnectionState): Promise<void> {
    invariant(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    return this._serviceProvider.services.NetworkService.updateConfig({ swarm }, { timeout: RPC_TIMEOUT });
  }

  /**
   * @internal
   */
  async _open(): Promise<void> {
    log.trace('dxos.sdk.mesh-proxy.open', trace.begin({ id: this._instanceId, parentId: this._traceParent }));

    // Register reconnection callback to re-establish streams.
    this._serviceProvider.onReconnect?.(async () => {
      log.info('reconnected, re-establishing streams');
      this._setupStreams();
    });

    this._setupStreams();
    log.trace('dxos.sdk.mesh-proxy.open', trace.end({ id: this._instanceId }));
  }

  /**
   * Set up RPC streams. Called on initial open and reconnect.
   */
  private _setupStreams(): void {
    this._streamSubscriptions.clear();

    invariant(this._serviceProvider.services.NetworkService, 'NetworkService is not available.');
    const networkStatusStream = this._serviceProvider.services.NetworkService.queryStatus(undefined, {
      timeout: RPC_TIMEOUT,
    });
    networkStatusStream.subscribe((networkStatus: NetworkStatus) => {
      this._networkStatusUpdated.emit(networkStatus);
    });
    this._streamSubscriptions.add(() => networkStatusStream.close());
  }

  /**
   * @internal
   */
  async _close(): Promise<void> {
    this._streamSubscriptions.clear();
  }
}
