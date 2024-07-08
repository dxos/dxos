//
// Copyright 2021 DXOS.org
//

import { type RequestOptions, type Stream } from '@dxos/codec-protobuf';
import {
  type DataService,
  type EchoEvent,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type HostInfo,
  type MutationReceipt,
  type ReIndexHeadsRequest,
  type SubscribeRequest,
  type SyncRepoRequest,
  type SyncRepoResponse,
  type WriteRequest,
} from '@dxos/protocols/proto/dxos/echo/service';

import { type AutomergeHost, type DocumentId } from '../automerge';

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
    await this._automergeHost.flush(request);
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

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    const states = await Promise.all(
      request.documentIds?.map(async (documentId): Promise<GetDocumentHeadsResponse.DocState> => {
        const heads = await this._automergeHost.getHeads(documentId as DocumentId);
        return {
          documentId,
          heads,
        };
      }) ?? [],
    );
    return { states };
  }

  async reIndexHeads(request: ReIndexHeadsRequest, options?: RequestOptions): Promise<void> {
    await this._automergeHost.reIndexHeads((request.documentIds ?? []) as DocumentId[]);
  }
}
