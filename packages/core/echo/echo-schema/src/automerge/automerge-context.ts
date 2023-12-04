//
// Copyright 2023 DXOS.org
//

import { type Message, NetworkAdapter, type PeerId, Repo, cbor } from '@dxos/automerge/automerge-repo';
import { type Stream } from '@dxos/codec-protobuf';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type DataService, type SyncRepoResponse } from '@dxos/protocols/proto/dxos/echo/service';

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
  private _clientId = `local:${PublicKey.random().toHex()}` as PeerId;
  private _stream?: Stream<SyncRepoResponse> | undefined = undefined;

  constructor(private readonly _dataService: DataService) {
    super();

    this.emit('ready', {
      network: this,
    });

    this.emit('peer-candidate', {
      peerId: SERVER_ID,
    });

    log.info('construct');
  }

  // TODO(dmaretskyi): Called with OUR peer id at start. Needs changing.
  override connect(peerId: PeerId): void {
    log.info('connect', { peerId });
    if (peerId !== SERVER_ID) {
      return;
    }
    invariant(!this._stream);

    this._stream = this._dataService.syncRepo({
      id: this._clientId,
    });
    this._stream.subscribe(
      (msg) => {
        log.info('received message', { msg });
        this.emit('message', cbor.decode(msg.syncMessage!));
      },
      (err) => {
        if (err) {
          log.catch(err);
        }
        this.emit('peer-disconnected', {
          peerId: SERVER_ID,
        });
      },
    );
  }

  override send(message: Message): void {
    log.info('send', { message });
    void this._dataService
      .sendSyncMessage({
        id: this._clientId,
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

const SERVER_ID = 'local:server' as PeerId;
