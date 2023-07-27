//
// Copyright 2021 DXOS.org
//

import invariant from 'tiny-invariant';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  DataService,
  MutationReceipt,
  SubscribeRequest,
  EchoEvent,
  WriteRequest,
} from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { DataServiceHost } from './data-service-host';

// TODO(burdon): Clear on close.
export class DataServiceSubscriptions {
  private readonly _spaces = new ComplexMap<PublicKey, DataServiceHost>(PublicKey.hash);

  clear() {
    this._spaces.clear();
  }

  async registerSpace(spaceKey: PublicKey, host: DataServiceHost) {
    log('Registering space', { spaceKey });
    invariant(!this._spaces.has(spaceKey));
    await host.open();
    this._spaces.set(spaceKey, host);
  }

  async  unregisterSpace(spaceKey: PublicKey) {
    log('Unregistering space', { spaceKey });
    const host = this._spaces.get(spaceKey);
    await host?.close();
    this._spaces.delete(spaceKey);
  }

  getDataService(spaceKey: PublicKey) {
    return this._spaces.get(spaceKey);
  }
}

/**
 * Routes DataService requests to different DataServiceHost instances based on space id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  constructor(private readonly _subscriptions: DataServiceSubscriptions) {}

  subscribe(request: SubscribeRequest): Stream<EchoEvent> {
    invariant(request.spaceKey);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new Error(`space not found: ${request.spaceKey}`));
    return host.subscribe();
  }

  write(request: WriteRequest): Promise<MutationReceipt> {
    invariant(request.spaceKey);
    invariant(request.batch);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new Error(`space not found: ${request.spaceKey}`));
    return host.write(request);
  }
}
