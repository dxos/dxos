//
// Copyright 2021 DXOS.org
//

import { type Stream } from '@dxos/codec-protobuf';
import {
  type DataService,
  type EchoEvent,
  type FlushRequest,
  type HostInfo,
  type MutationReceipt,
  type SubscribeRequest,
  type SyncRepoRequest,
  type SyncRepoResponse,
  type WriteRequest,
} from '@dxos/protocols/proto/dxos/echo/service';

import { type AutomergeHost } from '../automerge';

/**
 * Data sync between client and services.
 */
// TODO(burdon): Move to client-services.
export class DataServiceImpl implements DataService {
  constructor(private readonly _automergeHost: AutomergeHost) {}

  subscribe(request: SubscribeRequest): Stream<EchoEvent> {
    throw new Error('Deprecated.');
  }

  write(request: WriteRequest): Promise<MutationReceipt> {
    throw new Error('Deprecated.');
  }

  async flush(request: FlushRequest): Promise<void> {
    // TODO(dmaretskyi): Implement with automerge.
  }

  // Automerge specific.

  async getHostInfo(request: void): Promise<HostInfo> {
    return this._automergeHost.getHostInfo();
  }

  syncRepo(request: SyncRepoRequest): Stream<SyncRepoResponse> {
    return this._automergeHost.syncRepo(request);
  }

  sendSyncMessage(request: SyncRepoRequest): Promise<void> {
    return this._automergeHost.sendSyncMessage(request);
  }
}
