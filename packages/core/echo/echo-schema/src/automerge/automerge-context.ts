//
// Copyright 2023 DXOS.org
//

import { type Message, NetworkAdapter, type PeerId, Repo, cbor } from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type HostInfo, type DataService, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';

/**
 * Shared context for all spaces in the client.
 * Hosts the automerege repo.
 */
export class AutomergeContext {
  private _repo: Repo;

  constructor(dataService: DataService | null = null) {
    this._repo = new Repo({
      network: dataService ? [new LocalClientNetworkAdapter(dataService)] : [],
    });
  }

  get repo(): Repo {
    return this._repo;
  }
}

/**
 * Used to replicate with apps running on the same device.
 */
class LocalClientNetworkAdapter extends NetworkAdapter {
  /**
   * Own peer id given by automerge repo.
   */
  private _hostInfo?: HostInfo = undefined;
  private _stream?: Stream<SyncRepoResponse> | undefined = undefined;

  constructor(private readonly _dataService: DataService) {
    super();
    this.emit('ready', {
      network: this,
    });
  }

  override connect(peerId: PeerId): void {
    invariant(!this._stream);

    log.info('connect', { peerId });
    this.peerId = peerId;
    this._stream = this._dataService.syncRepo({
      id: peerId,
    });
    this._stream.subscribe(
      (msg) => {
        log.info('received message', { msg: cbor.decode(msg.syncMessage!) });
        this.emit('message', cbor.decode(msg.syncMessage!));
      },
      (err) => {
        if (err) {
          log.catch(err);
        }
        if (this._hostInfo) {
          this.emit('peer-disconnected', {
            peerId: this._hostInfo.peerId as PeerId,
          });
        }
      },
    );

    this._dataService
      .getHostInfo()
      .then((hostInfo) => {
        this._hostInfo = hostInfo;
        log.info('peer candidate', { hostInfo });
        this.emit('peer-candidate', {
          peerId: this._hostInfo.peerId as PeerId,
        });
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  override send(message: Message): void {
    log.info('send', { message, peerId: this.peerId });
    invariant(this.peerId);
    void this._dataService
      .sendSyncMessage({
        id: this.peerId,
        syncMessage: cbor.encode(message),
      })
      .catch((err) => {
        log.catch(err);
      });
  }

  override disconnect(): void {
    log.info('disconnect');
    void this._stream?.close().catch((err) => {
      log.catch(err);
    });
    this._stream = undefined;
  }
}
