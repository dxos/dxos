//
// Copyright 2024 DXOS.org
//

import type { Command } from '@oclif/core';

import { AbstractBaseCommand, FriendlyError } from '@dxos/cli-base';
import { invariant } from '@dxos/invariant';

import { PublisherRpcPeer, SupervisorRpcPeer, TunnelRpcPeer } from './util';

export class PublisherConnectionError extends FriendlyError {
  constructor() {
    super('Error while connecting to kube publisher.');
  }
}

// TODO(burdon): Remove deprecated methods.
export abstract class BaseCommand<T extends typeof Command = any> extends AbstractBaseCommand<T> {
  /**
   * Convenience function to wrap command passing in KUBE publisher.
   */
  async execWithPublisher<T>(callback: (rpc: PublisherRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: PublisherRpcPeer | undefined;
    try {
      const wsEndpoint = this.clientConfig.get('runtime.services.publisher.server');
      invariant(wsEndpoint);
      rpc = new PublisherRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.log('Publisher failed: ', err);
      this.catch(new PublisherConnectionError());
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  /**
   * @deprecated
   */
  async execWithTunneling<T>(callback: (rpc: TunnelRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: TunnelRpcPeer | undefined;
    try {
      const wsEndpoint = this.clientConfig.get('runtime.services.tunneling.server');
      invariant(wsEndpoint);
      rpc = new TunnelRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.catch(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }

  async execWithSupervisor<T>(callback: (rpc: SupervisorRpcPeer) => Promise<T | undefined>): Promise<T | undefined> {
    let rpc: SupervisorRpcPeer | undefined;
    try {
      const wsEndpoint = this.clientConfig.get('runtime.services.supervisor.server');
      invariant(wsEndpoint);
      rpc = new SupervisorRpcPeer(wsEndpoint);
      await Promise.race([rpc.connected.waitForCount(1), rpc.error.waitForCount(1).then((err) => Promise.reject(err))]);
      return await callback(rpc);
    } catch (err: any) {
      this.catch(err);
    } finally {
      if (rpc) {
        await rpc.close();
      }
    }
  }
}
