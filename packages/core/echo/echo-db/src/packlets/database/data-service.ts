//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import {
  DataService as DataServiceRpc,
  MutationReceipt,
  SubscribeEntitySetRequest,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse,
  WriteRequest
} from '@dxos/protocols/proto/dxos/echo/service';
import { ComplexMap } from '@dxos/util';

import { SpaceNotFoundError } from '../errors/index.js';
import { DataServiceHost } from './data-service-host.js';

const log = debug('dxos:echo-db:data-service-router');

/**
 * Routes DataService requests to different DataServiceHost instances based on party id.
 */
// TODO(burdon): Move service definition to client-services.
export class DataService implements DataServiceRpc {
  private readonly _trackedParties = new ComplexMap<PublicKey, DataServiceHost>(key => key.toHex());

  // TODO(burdon): Register party.
  trackParty (key: PublicKey, host: DataServiceHost) {
    log(`Tracking party: ${key}`);
    this._trackedParties.set(key, host);
  }

  subscribeEntitySet (request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
    assert(request.partyKey);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.subscribeEntitySet();
  }

  subscribeEntityStream (request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    assert(request.partyKey);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.subscribeEntityStream(request);
  }

  write (request: WriteRequest): Promise<MutationReceipt> {
    assert(request.partyKey);
    assert(request.mutation);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new SpaceNotFoundError(request.partyKey));
    return host.write(request.mutation);
  }
}
