//
// Copyright 2023 DXOS.org
//

import { next as automerge } from '@dxos/automerge/automerge';
import { type Message, NetworkAdapter, type PeerId, Repo, cbor } from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type HostInfo, type DataService, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';
import { trace } from '@dxos/tracing';
import { mapValues } from '@dxos/util';

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

  constructor(dataService: DataService | undefined = undefined) {
    this._peerId = `client-${PublicKey.random().toHex()}` as PeerId;
    if (dataService) {
      this._adapter = new LocalClientNetworkAdapter(dataService);
      this._repo = new Repo({
        peerId: this._peerId as PeerId,
        network: [this._adapter],
        sharePolicy: async () => true,
      });
      this._adapter.ready();
    } else {
      this._repo = new Repo({ network: [] });
    }
  }

  get repo(): Repo {
    return this._repo;
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
    // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
    //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
    this.emit('ready', {
      network: this,
    });
  }

  override connect(peerId: PeerId): void {
    // NOTE: Expects that `AutomergeHost` host already running and listening for connections.
    invariant(!this._stream);

    this.peerId = peerId;
    this._stream = this._dataService.syncRepo({
      id: peerId,
    });
    this._stream.subscribe(
      (msg) => {
        this.emit('message', cbor.decode(msg.syncMessage!));
      },
      (err) => {
        // TODO(mykola): Add connection retry?
        if (err) {
          log.catch(err);
        }
        if (this._hostInfo) {
          this.emit('peer-disconnected', {
            peerId: this._hostInfo.peerId as PeerId,
          });
        }
        void this.close().catch((err) => log.catch(err));
      },
    );

    this._dataService
      .getHostInfo()
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

  override send(message: Message): void {
    invariant(this.peerId);
    void this._dataService
      .sendSyncMessage(
        {
          id: this.peerId,
          syncMessage: cbor.encode(message),
        },
        { timeout: 5_000 },
      )
      .catch((err) => {
        log.catch(err);
      });
  }

  async close() {
    await this._stream?.close();
    this._stream = undefined;
    this.emit('close');
  }

  override disconnect(): void {
    // TODO(mykola): `disconnect` is not used anywhere in `Repo` from `@automerge/automerge-repo`. Should we remove it?
    // No-op
  }
}
