//
// Copyright 2021 DXOS.org
//

import * as Runtime from 'effect/Runtime';

import { Event, MulticastObservable, SubscriptionList } from '@dxos/async';
import { type ClientServicesProvider } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { runServiceCall, subscribeStream } from '@dxos/protocols';
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

  constructor(
    private readonly _serviceProvider: ClientServicesProvider,
    private readonly _runtime: Runtime.Runtime<never> = Runtime.defaultRuntime,
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
    await runServiceCall(this._runtime, this._serviceProvider.rpc.NetworkService.updateConfig({ swarm }), {
      timeout: RPC_TIMEOUT,
      label: 'NetworkService.updateConfig',
    });
  }

  /**
   * @internal
   */
  async _open(): Promise<void> {
    log('opening mesh proxy');

    // Register reconnection callback to re-establish streams.
    this._serviceProvider.onReconnect?.(async () => {
      log('reconnected, re-establishing streams');
      this._setupStreams();
    });

    this._setupStreams();
    log('opened mesh proxy');
  }

  /**
   * Set up RPC streams. Called on initial open and reconnect.
   */
  private _setupStreams(): void {
    this._streamSubscriptions.clear();

    this._streamSubscriptions.add(
      subscribeStream(this._runtime, this._serviceProvider.rpc.NetworkService.queryStatus(undefined), {
        onData: (networkStatus) => this._networkStatusUpdated.emit(networkStatus),
      }),
    );
  }

  /**
   * @internal
   */
  async _close(): Promise<void> {
    this._streamSubscriptions.clear();
  }
}
