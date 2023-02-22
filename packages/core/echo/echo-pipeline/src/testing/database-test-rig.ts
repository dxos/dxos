//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseBackendProxy, ItemManager } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { FeedMessageBlock } from '@dxos/protocols';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { TextModel } from '@dxos/text-model';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

import { DatabaseBackendHost } from '../dbhost';

const SPACE_KEY = PublicKey.random();

export class DatabaseTestRig {
  public readonly peers = new ComplexMap<PublicKey, DatabaseTestPeer>(PublicKey.hash);

  async createPeer(): Promise<DatabaseTestPeer> {
    const peer = new DatabaseTestPeer(this);
    this.peers.set(peer.key, peer);
    await peer.open();
    return peer;
  }
}

export class DatabaseTestPeer {
  public readonly modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);

  public items!: ItemManager;
  public proxy!: DatabaseBackendProxy;

  public host!: DatabaseBackendHost;
  public hostItems!: ItemManager;

  //
  // Test state.
  //

  public readonly key = PublicKey.random();

  public feedMessages: FeedMessage[] = [];

  /**
   * Sequence number of the last mutation confirmed to be written to the feed store.
   */
  public confirmed = -1;

  /**
   * Current position of the peer's pipeline.
   */
  public timeframe = new Timeframe();

  public snapshot: SpaceSnapshot | undefined;

  private readonly _onConfirm = new Event();

  constructor(public readonly rig: DatabaseTestRig) {}

  async open() {
    this.hostItems = new ItemManager(this.modelFactory);
    this.host = new DatabaseBackendHost(
      {
        write: async (message) => {
          const seq =
            this.feedMessages.push({
              timeframe: this.timeframe,
              payload: {
                data: message
              }
            }) - 1;

          await this._onConfirm.waitFor(() => this.confirmed >= seq);
          return {
            seq,
            feedKey: this.key
          };
        }
      },
      this.snapshot?.database
    );
    await this.host.open(this.hostItems, this.modelFactory);

    this.proxy = new DatabaseBackendProxy(this.host.createDataServiceHost(), SPACE_KEY);
    this.items = new ItemManager(this.modelFactory);
    await this.proxy.open(this.items, this.modelFactory);
  }

  /**
   * Confirm mutations written to the local feed.
   * @param seq Sequence number of the mutation to confirm. If not specified, all mutations will be confirmed.
   */
  confirm(seq?: number) {
    this.confirmed = seq ?? this.feedMessages.length - 1;
    this._onConfirm.emit();

    this._processMessages(Timeframe.merge(this.timeframe, new Timeframe([[this.key, this.confirmed]])));
  }

  /**
   * Replicate the database to the specified timeframe.
   * @param to Timeframe to replicate to. If not specified, the database will be replicated to the latest timeframe (based on all other peers).
   */
  replicate(to?: Timeframe) {
    const toTimeframe = Timeframe.merge(
      to ?? new Timeframe(Array.from(this.rig.peers.values()).map((peer) => [peer.key, peer.confirmed])),
      this.timeframe
    );
    toTimeframe.set(this.key, this.confirmed);

    this._processMessages(toTimeframe);
  }

  /**
   * Reload data from the feed. Wipes unconfirmed mutations.
   */
  async reload() {
    await this.open();
    const timeframe = this.timeframe;
    this.timeframe = this.snapshot?.timeframe ?? new Timeframe();
    this._processMessages(timeframe);
  }

  /**
   * Create snapshot and use it for the next reload.
   */
  makeSnapshot(): SpaceSnapshot {
    this.snapshot = {
      spaceKey: SPACE_KEY.asUint8Array(),
      database: this.host.createSnapshot(),
      timeframe: this.timeframe
    };
    return this.snapshot;
  }

  /**
   * Gets all candidate messages according to the current timeframe.
   * Does not take into account the current snapshot, timeframe dependencies, or the confirmed, or replicated state.
   */
  private _getHeads(): FeedMessageBlock[] {
    return Array.from(this.rig.peers.values())
      .map((peer): FeedMessageBlock => {
        const seq = this.timeframe.get(peer.key) ?? -1;
        const message = peer.feedMessages[seq + 1];
        return (
          message && {
            feedKey: peer.key,
            seq: seq + 1,
            data: message
          }
        );
      })
      .filter(isNotNullOrUndefined);
  }

  private _processMessages(to: Timeframe) {
    let run = true;
    while (run) {
      run = false;

      const heads = this._getHeads();
      for (const candidate of heads) {
        const toSeq = to.get(candidate.feedKey) ?? -1;
        if (toSeq < candidate.seq) {
          continue;
        }

        const snapshotSeq = this.snapshot?.timeframe?.get(candidate.feedKey) ?? -1;
        if (candidate.seq <= snapshotSeq) {
          continue;
        }

        if (!Timeframe.dependencies(candidate.data.timeframe, this.timeframe).isEmpty()) {
          continue;
        }

        run = true;
        this.host.echoProcessor({
          data: candidate.data.payload.data!.object,
          meta: {
            feedKey: candidate.feedKey,
            seq: candidate.seq,
            memberKey: candidate.feedKey,
            timeframe: candidate.data.timeframe
          }
        });
        this.timeframe = Timeframe.merge(this.timeframe, new Timeframe([[candidate.feedKey, candidate.seq]]));
      }
    }
  }
}
