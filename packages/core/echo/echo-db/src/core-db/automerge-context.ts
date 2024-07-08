//
// Copyright 2023 DXOS.org
//

import { next as automerge } from '@dxos/automerge/automerge';
import { type PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { exposeModule } from '@dxos/debug';
import { decodeReference, type ObjectStructure } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type DataService,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type HostInfo,
  type ReIndexHeadsRequest,
  type SyncRepoResponse,
} from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { mapValues } from '@dxos/util';

import { RepoClient } from '../client';

exposeModule('@automerge/automerge', automerge);

const RPC_TIMEOUT = 20_000;

/**
 * Shared context for all spaces in the client.
 * Hosts the automerege repo.
 */
@trace.resource()
export class AutomergeContext extends Resource {
  private readonly _repo: RepoClient;

  @trace.info()
  private readonly _peerId: string;

  @trace.info()
  public readonly spaceFragmentationEnabled: boolean;

  constructor(
    private readonly _dataService: DataService,
    config: AutomergeContextConfig = {},
  ) {
    super();
    this._peerId = `client-${PublicKey.random().toHex()}` as PeerId;
    this.spaceFragmentationEnabled = config.spaceFragmentationEnabled ?? false;
    //
    this._repo = new RepoClient(this._dataService);

    trace.diagnostic({
      id: 'working-set',
      name: 'Objects in the working set',
      fetch: () =>
        Object.entries(this._repo.handles).flatMap(([docId, handle]) => {
          const doc = handle.docSync();
          if (!doc) {
            return [];
          }

          const spaceKey = doc.access.spaceKey;
          return (Object.entries(doc.objects) as [string, ObjectStructure][]).map(([objectId, object]) => {
            return {
              objectId,
              docId,
              spaceKey,
              type: object.system?.type ? decodeReference(object.system.type).objectId : undefined,
            };
          });
        }),
    });
  }

  get repo(): RepoClient {
    return this._repo;
  }

  override async _open() {
    await this._repo.open?.();
  }

  override async _close() {
    await this._repo.close?.();
  }

  /**
   * Waits to flush all data to the storage.
   *
   * Note: AutomergeContext does not have a storage adapter,
   *       so this method sends a RPC call to the AutomergeHost.
   */
  async flush(request: FlushRequest): Promise<void> {
    await this._dataService?.flush(request, { timeout: RPC_TIMEOUT }); // TODO(dmaretskyi): Set global timeout instead.
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    invariant(this._dataService);
    return this._dataService.getDocumentHeads(request, { timeout: RPC_TIMEOUT });
  }

  async reIndexHeads(request: ReIndexHeadsRequest): Promise<void> {
    invariant(this._dataService);
    await this._dataService.reIndexHeads(request, { timeout: 0 });
  }

  @trace.info({ depth: null })
  private _automergeDocs() {
    return mapValues(this._repo.handles, (handle) => ({
      state: handle.state,
      hasDoc: !!handle.docSync(),
      heads: handle.docSync() ? automerge.getHeads(handle.docSync()) : null,
      data:
        handle.docSync()?.doc &&
        mapValues(handle.docSync()?.doc, (value, key) => {
          try {
            switch (key) {
              case 'access':
              case 'links':
                return value;
              case 'objects':
                return Object.keys(value as any);
              default:
                return `${value}`;
            }
          } catch (err) {
            return `${err}`;
          }
        }),
    }));
  }
}

export interface AutomergeContextConfig {
  spaceFragmentationEnabled?: boolean;
}
