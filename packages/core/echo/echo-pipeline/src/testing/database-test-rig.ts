//
// Copyright 2023 DXOS.org
//

import { Event, Trigger } from '@dxos/async';
import { DocumentModel } from '@dxos/document-model';
import { DatabaseProxy, ItemManager, createModelMutation, encodeModelMutation } from '@dxos/echo-db';
import { type WriteOptions, type WriteReceipt } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { ModelFactory } from '@dxos/model-factory';
import { type FeedMessageBlock, schema } from '@dxos/protocols';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type EchoSnapshot, type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type Epoch } from '@dxos/protocols/proto/dxos/halo/credentials';
import { TextModel } from '@dxos/text-model';
import { Timeframe } from '@dxos/timeframe';
import { ComplexMap, isNotNullOrUndefined } from '@dxos/util';

import { DatabaseHost } from '../db-host';

const SPACE_KEY = PublicKey.random();

export class DatabaseTestBuilder {
  public readonly peers = new ComplexMap<PublicKey, DatabaseTestPeer>(PublicKey.hash);

  async createPeer(spaceKey = SPACE_KEY): Promise<DatabaseTestPeer> {
    const peer = new DatabaseTestPeer(this, spaceKey);
    this.peers.set(peer.key, peer);
    await peer.open();
    return peer;
  }
}

type WriteRequest = {
  receipt: WriteReceipt;
  options: WriteOptions;
  trigger: Trigger;
};

export class DatabaseTestPeer {
  public readonly modelFactory = new ModelFactory().registerModel(DocumentModel).registerModel(TextModel);

  public items!: ItemManager;
  public proxy!: DatabaseProxy;

  public host!: DatabaseHost;
  public hostItems!: ItemManager;

  //
  // Test state.
  //

  public readonly key = PublicKey.random();

  public feedMessages: FeedMessage[] = [];

  public readonly snapshots = new Map<string, SpaceSnapshot>();
  private currentEpoch?: Epoch;

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

  private readonly _writes = new Set<WriteRequest>();

  constructor(public readonly rig: DatabaseTestBuilder, public readonly spaceKey: PublicKey) {}

  async open() {
    this.hostItems = new ItemManager(this.modelFactory);
    this.host = new DatabaseHost(
      {
        write: async (message, { afterWrite }: WriteOptions) => {
          const seq =
            this.feedMessages.push({
              timeframe: this.timeframe,
              payload: {
                data: message,
              },
            }) - 1;

          const request: WriteRequest = {
            receipt: {
              seq,
              feedKey: this.key,
            },
            options: { afterWrite },
            trigger: new Trigger(),
          };
          this._writes.add(request);
          await request.trigger.wait();
          return request.receipt;
        },
      },
      async () => {
        // No-op.
      },
    );

    await this.host.open(this.hostItems, this.modelFactory);
    if (this.snapshot) {
      this.host._itemDemuxer.restoreFromSnapshot(this.snapshot.database);
    }

    this.items = new ItemManager(this.modelFactory);
    this.proxy = new DatabaseProxy({
      service: this.host.createDataServiceHost({ deferEvents: false }),
      itemManager: this.items,
      spaceKey: this.spaceKey,
    });
    await this.proxy.open(this.modelFactory);
  }

  /**
   * Confirm mutations written to the local feed.
   * @param seq Sequence number of the mutation to confirm. If not specified, all mutations will be confirmed.
   */
  async confirm(seq?: number) {
    this.confirmed = seq ?? this.feedMessages.length - 1;
    this._onConfirm.emit();

    for (const request of [...this._writes]) {
      if (this.confirmed >= request.receipt.seq) {
        this._writes.delete(request);
        await request.options.afterWrite?.(request.receipt);
        request.trigger.wake();
      }
    }

    this._processMessages(Timeframe.merge(this.timeframe, new Timeframe([[this.key, this.confirmed]])));
  }

  /**
   * Replicate the database to the specified timeframe.
   * @param to Timeframe to replicate to. If not specified, the database will be replicated to the latest timeframe (based on all other peers).
   */
  replicate(to?: Timeframe) {
    const toTimeframe = Timeframe.merge(
      to ?? new Timeframe(Array.from(this.rig.peers.values()).map((peer) => [peer.key, peer.confirmed])),
      this.timeframe,
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
      timeframe: this.timeframe,
    };
    return this.snapshot;
  }

  createEpoch(mockSnapshot?: EchoSnapshot) {
    const snapshot = this.makeSnapshot();
    // Substitute snapshot with the mock one for test purposes (e.g. to test with empty snapshot).
    mockSnapshot && (snapshot.database = mockSnapshot);
    const snapshotCid = PublicKey.from(
      schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').encode(snapshot),
    ).toHex();
    this.snapshots.set(snapshotCid, snapshot);

    const epoch: Epoch = {
      previousId: PublicKey.random(),
      timeframe: this.timeframe,
      number: this.currentEpoch ? this.currentEpoch.number + 1 : 0,
      snapshotCid,
    };

    this.currentEpoch = epoch;

    this.host._itemDemuxer.restoreFromSnapshot(snapshot.database);
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
            data: message,
          }
        );
      })
      .filter(isNotNullOrUndefined);
  }

  private async _processMessages(to: Timeframe) {
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
          batch: candidate.data.payload.data!.batch,
          meta: {
            feedKey: candidate.feedKey,
            seq: candidate.seq,
            memberKey: candidate.feedKey,
            timeframe: candidate.data.timeframe,
          },
        });
        this.timeframe = Timeframe.merge(this.timeframe, new Timeframe([[candidate.feedKey, candidate.seq]]));
      }
    }
    this.host.createDataServiceHost
  }

  getModel(id: string): DocumentModel | TextModel | undefined {
    const item = this.items.getItem(id);
    if (!item) {
      return;
    }

    invariant(item.modelMeta);
    const ModelConstructor = this.modelFactory.getModel(item.modelMeta.type)?.constructor;
    invariant(ModelConstructor);

    const model = new ModelConstructor(
      item.modelMeta,
      item.id,
      () => item.state,
      async (mutation) => {
        invariant(item.modelMeta);
        this.proxy.mutate(createModelMutation(id, encodeModelMutation(item.modelMeta, mutation)));
        return {
          feedKey: PublicKey.from('00'),
          seq: 0,
          waitToBeProcessed: () => Promise.resolve(),
        };
      },
    );
    model.initialize();

    return model;
  }
}
