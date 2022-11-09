//
// Copyright 2021 DXOS.org
//

import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import {
  DataService,
  MutationReceipt,
  SubscribeEntitySetRequest,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse,
  WriteRequest
} from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { SpaceNotFoundError } from '../errors';
import { DataServiceHost } from './data-service-host';

// TODO(burdon): Clear on close.
export class DataServiceSubscriptions {
  private readonly _spaces = new ComplexMap<PublicKey, DataServiceHost>(PublicKey.hash);

  clear() {
    this._spaces.clear();
  }

  registerSpace(spaceKey: PublicKey, host: DataServiceHost) {
    this._spaces.set(spaceKey, host);
  }

  unregisterSpace(spaceKey: PublicKey) {
    this._spaces.delete(spaceKey);
  }

  getDataService(spaceKey: PublicKey) {
    return this._spaces.get(spaceKey);
  }
}

/**
 * Routes DataService requests to different DataServiceHost instances based on party id.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  constructor(private readonly _subscriptions: DataServiceSubscriptions) {}

  subscribeEntitySet(request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
    assert(request.partyKey);
    const host =
      this._subscriptions.getDataService(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.subscribeEntitySet();
  }

  subscribeEntityStream(request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    assert(request.partyKey);
    const host =
      this._subscriptions.getDataService(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.subscribeEntityStream(request);
  }

  write(request: WriteRequest): Promise<MutationReceipt> {
    assert(request.partyKey);
    assert(request.mutation);
    const host =
      this._subscriptions.getDataService(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.write(request.mutation);
  }
}
