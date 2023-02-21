import { DatabaseBackendProxy, ItemManager } from "@dxos/echo-db";
import { PublicKey } from "@dxos/keys";
import { DataMessage } from "@dxos/protocols/proto/dxos/echo/feed";
import { Timeframe } from "@dxos/timeframe";
import { DatabaseBackendHost } from "../dbhost";

export class DatabaseTestRig {
  createPeer(): DatabaseTestPeer {

  }

  async open() {

  }

  async close() {

  }
}


export class DatabaseTestPeer {
  public readonly items: ItemManager;
  public readonly host: DatabaseBackendHost;
  public readonly proxy: DatabaseBackendProxy;

  //
  // Test state.
  //

  public readonly key = PublicKey.random();
  
  public feedMessages: DataMessage[] = [];

  /**
   * Sequence number of the last mutation confirmed to be written to the feed store.
   */
  public confirmed: number = -1;

  /**
   * Current position of the peer's pipeline.
   */
  public timeframe = new Timeframe();

  async open() {

  }

  async close() {

  }

  /**
   * Confirm mutations written to the local feed.
   * @param seq Sequence number of the mutation to confirm. If not specified, all mutations will be confirmed.
   */
  confirm(seq?: number) {

  }

  /**
   * Replicate the database to the specified timeframe.
   * @param to Timeframe to replicate to. If not specified, the database will be replicated to the latest timeframe (based on all other peers).
   */
  replicate(to?: Timeframe) {

  }
}