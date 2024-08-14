//
// Copyright 2023 DXOS.org
//

import { next as automerge } from '@dxos/automerge/automerge';
import { type PeerId } from '@dxos/automerge/automerge-repo';
import { Resource } from '@dxos/context';
import { exposeModule } from '@dxos/debug';
import { decodeReference, type ObjectStructure } from '@dxos/echo-protocol';
import { PublicKey, type SpaceId } from '@dxos/keys';
import {
  type DataService,
  type FlushRequest,
  type GetDocumentHeadsRequest,
  type GetDocumentHeadsResponse,
  type ReIndexHeadsRequest,
  type SpaceSyncState,
  type WaitUntilHeadsReplicatedRequest,
} from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { mapValues } from '@dxos/util';

import { RepoProxy } from '../client';

exposeModule('@automerge/automerge', automerge);

const RPC_TIMEOUT = 20_000;

/**
 * Shared context for all spaces in the client.
 * Hosts the automerege repo.
 */
@trace.resource()
export class AutomergeContext extends Resource {
  private readonly _repo: RepoProxy;

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
    this._repo = new RepoProxy(this._dataService);

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
          const heads = doc ? automerge.getHeads(doc) : null;
          return (Object.entries(doc.objects ?? {}) as [string, ObjectStructure][]).map(([objectId, object]) => {
            return {
              objectId,
              docId,
              spaceKey,
              heads,
              type: object.system?.type ? decodeReference(object.system.type).objectId : undefined,
            };
          });
        }),
    });
  }

  get repo(): RepoProxy {
    return this._repo;
  }

  override async _open() {
    await this._repo.open();
  }

  override async _close() {
    await this._repo.close();
  }

  /**
   * Waits to flush all data to the storage.
   *
   * Note: AutomergeContext does not have a storage adapter,
   *       so this method sends a RPC call to the AutomergeHost.
   */
  async flush(request: FlushRequest): Promise<void> {
    await this._repo.flush();
    await this._dataService.flush(request, { timeout: RPC_TIMEOUT });
  }

  async getDocumentHeads(request: GetDocumentHeadsRequest): Promise<GetDocumentHeadsResponse> {
    return this._dataService.getDocumentHeads(request, { timeout: RPC_TIMEOUT });
  }

  async waitUntilHeadsReplicated(request: WaitUntilHeadsReplicatedRequest) {
    await this._dataService.waitUntilHeadsReplicated(request, { timeout: 0 });
  }

  async reIndexHeads(request: ReIndexHeadsRequest): Promise<void> {
    await this._dataService.reIndexHeads(request, { timeout: 0 });
  }

  async updateIndexes() {
    await this._dataService.updateIndexes(undefined, { timeout: 0 });
  }

  async getSyncState(spaceId: SpaceId): Promise<SpaceSyncState> {
    return this._dataService.getSpaceSyncState(
      {
        spaceId,
      },
      { timeout: RPC_TIMEOUT },
    );
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
