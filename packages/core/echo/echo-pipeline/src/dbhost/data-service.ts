//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  DataService,
  MutationReceipt,
  SubscribeRequest,
  EchoEvent,
  WriteRequest
} from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { DataServiceHost } from './data-service-host';

// TODO(burdon): Clear on close.
export class DataServiceSubscriptions {
  private readonly _spaces = new ComplexMap<PublicKey, DataServiceHost>(PublicKey.hash);

  clear() {
    this._spaces.clear();
  }

  registerSpace(spaceKey: PublicKey, host: DataServiceHost) {
    log('Registering space', { spaceKey });
    this._spaces.set(spaceKey, host);
  }

  unregisterSpace(spaceKey: PublicKey) {
    log('Unregistering space', { spaceKey });
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
    assert(request.spaceKey);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new Error(`space not found: ${request.spaceKey}`));
    return host.subscribe();
  }

  write(request: WriteRequest): Promise<MutationReceipt> {
    assert(request.spaceKey);
    assert(request.batch);
    const host =
      this._subscriptions.getDataService(request.spaceKey) ?? raise(new Error(`space not found: ${request.spaceKey}`));
    return host.write(request);
  }
}
