//
// Copyright 2023 DXOS.org
//

import { next as automerge } from '@dxos/automerge/automerge';
import { type Message, NetworkAdapter, type PeerId, Repo, cbor } from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { exposeModule } from '@dxos/debug';
import { type ObjectStructure } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type HostInfo,
  type DataService,
  type SyncRepoResponse,
  type FlushRequest,
} from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { mapValues } from '@dxos/util';

exposeModule('@automerge/automerge', automerge);

const RPC_TIMEOUT = 20_000;

/**
 * Shared context for all spaces in the client.
 * Hosts the automerege repo.
 */
@trace.resource()
export class AutomergeContext {
  private _repo: Repo;

  @trace.info()
  private _adapter?: LocalClientNetworkAdapter = undefined;

  @trace.info()
  private readonly _peerId: string;

  @trace.info()
  public readonly spaceFragmentationEnabled: boolean;

  constructor(
    private readonly _dataService: DataService | undefined = undefined,
    config: AutomergeContextConfig = {},
  ) {
    this._peerId = `client-${PublicKey.random().toHex()}` as PeerId;
    this.spaceFragmentationEnabled = config.spaceFragmentationEnabled ?? false;
    if (this._dataService) {
      this._adapter = new LocalClientNetworkAdapter(this._dataService);
      this._repo = new Repo({
        peerId: this._peerId as PeerId,
        network: [this._adapter],
        sharePolicy: async () => true,
      });
      this._adapter.ready();
    } else {
      // log.warn('Running ECHO without a service connection is deprecated. No data will be persisted.');
      this._repo = new Repo({ network: [] });
    }

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
              id: objectId,
              docId,
              spaceKey,
              type: object.system.type?.itemId,
            };
          });
        }),
    });
  }

  get repo(): Repo {
    return this._repo;
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

  @trace.info({ depth: null })
  private _automergePeers() {
    return this._repo.peers;
  }

  async close() {
    await this._adapter?.close();
  }
}

/**
 * Used to replicate with apps running on the same device.
 */
@trace.resource()
class LocalClientNetworkAdapter extends NetworkAdapter {
  private _isClosed = false;

  /**
   * Own peer id given by automerge repo.
   */
  @trace.info()
  private _hostInfo?: HostInfo = undefined;

  @trace.info()
  private _stream?: Stream<SyncRepoResponse> | undefined = undefined;

  constructor(private readonly _dataService: DataService) {
    super();
  }

  /**
   * Emits `ready` event. That signals to `Repo` that it can start using the adapter.
   */
  ready() {
    invariant(!this._isClosed);
    // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
    //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
    this.emit('ready', {
      network: this,
    });
  }

  override connect(peerId: PeerId): void {
    log('connecting...');

    // NOTE: Expects that `AutomergeHost` host already running and listening for connections.
    invariant(!this._isClosed);
    invariant(!this._stream);

    this.peerId = peerId;
    this._stream = this._dataService.syncRepo(
      {
        id: peerId,
      },
      { timeout: RPC_TIMEOUT },
    ); // TODO(dmaretskyi): Set global timeout instead.
    this._stream.subscribe(
      (msg) => {
        this.emit('message', cbor.decode(msg.syncMessage!));
      },
      (err) => {
        // TODO(mykola): Add connection retry?
        if (err && !this._isClosed) {
          log.catch(err);
        }
        if (this._hostInfo) {
          this.emit('peer-disconnected', {
            peerId: this._hostInfo.peerId as PeerId,
          });
        }
        if (!this._isClosed) {
          void this.close().catch((err) => log.catch(err));
        }
      },
    );

    this._dataService
      .getHostInfo(undefined, { timeout: RPC_TIMEOUT }) // TODO(dmaretskyi): Set global timeout instead.
      .then((hostInfo) => {
        this._hostInfo = hostInfo;
        this.emit('peer-candidate', {
          peerMetadata: {},
          peerId: this._hostInfo.peerId as PeerId,
        });
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  override disconnect(): void {
    // TODO(mykola): `disconnect` is not used anywhere in `Repo` from `@automerge/automerge-repo`. Should we remove it?
    // No-op.
  }

  async close() {
    log('closing...');
    this._isClosed = true;
    await this._stream?.close();
    this._stream = undefined;
    log('closed');
    this.emit('close');
  }

  override send(message: Message): void {
    log('sending...');
    invariant(this.peerId);
    invariant(!this._isClosed);
    void this._dataService
      .sendSyncMessage(
        {
          id: this.peerId,
          syncMessage: cbor.encode(message),
        },
        { timeout: RPC_TIMEOUT }, // TODO(dmaretskyi): Set global timeout instead.
      )
      .then(() => {
        log('sent');
      })
      .catch((err) => {
        if (!this._isClosed) {
          log.catch(err);
        }
      });
  }
}

export interface AutomergeContextConfig {
  spaceFragmentationEnabled?: boolean;
}
