//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Stream } from '@dxos/codec-protobuf';
import { raise } from '@dxos/debug';
import {
  DataService,
  MutationReceipt,
  PartyKey,
  SubscribeEntitySetRequest,
  SubscribeEntitySetResponse,
  SubscribeEntityStreamRequest,
  SubscribeEntityStreamResponse,
  WriteRequest
} from '@dxos/echo-protocol';
import { ComplexMap } from '@dxos/util';

import { PartyNotFoundError } from '../errors';
import { DataServiceHost } from './data-service-host';

const log = debug('dxos:echo-db:data-service-router');

/**
 * Routes DataService requests to different DataServiceHost instances based on party id.
 */
export class DataServiceRouter implements DataService {
  private readonly _trackedParties = new ComplexMap<PartyKey, DataServiceHost>(x => x.toHex())

  trackParty (key: PartyKey, host: DataServiceHost) {
    log(`Tracking party: ${key}`);
    this._trackedParties.set(key, host);
  }

  subscribeEntitySet (request: SubscribeEntitySetRequest): Stream<SubscribeEntitySetResponse> {
    assert(request.partyKey);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
    return host.subscribeEntitySet();
  }

  subscribeEntityStream (request: SubscribeEntityStreamRequest): Stream<SubscribeEntityStreamResponse> {
    assert(request.partyKey);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
    return host.subscribeEntityStream(request);
  }

  write (request: WriteRequest): Promise<MutationReceipt> {
    assert(request.partyKey);
    assert(request.mutation);
    const host = this._trackedParties.get(request.partyKey) ?? raise(new PartyNotFoundError(request.partyKey));
    return host.write(request.mutation);
  }
}
