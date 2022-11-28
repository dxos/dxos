import { FeedFactory, FeedStore } from "@dxos/feed-store";
import { Keyring } from "@dxos/keyring";
import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import { createStorage, StorageType } from "@dxos/random-access-storage";
import { Teleport } from "@dxos/teleport";
import { afterTest } from "@dxos/testutils";
import { range } from "@dxos/util";
import { pipeline } from "stream";
import { ReplicatorExtension } from "./replicator-extension";

export class TestBuilder {
  createAgent(): TestAgent {
    return new TestAgent();
  }
}

export class TestAgent {
  public storage = createStorage({ type: StorageType.RAM });
  public keyring = new Keyring(this.storage.createDirectory('keyring'));
  public feedStore = new FeedStore({
    factory: new FeedFactory({ root: this.storage.createDirectory('feeds'), signer: this.keyring })
  });

  async createWriteFeed(numBlocks = 0) {
    const feed = await this.feedStore.openFeed(await this.keyring.createKey(), { writable: true });

    for (const i of range(numBlocks)) {
      await feed.append(Buffer.from(`data-${i}`));
    }

    return feed;
  }

  createReadFeed(key: PublicKey) {
    return this.feedStore.openFeed(key);
  }
}

export const createStreamPair = async () => {
  const peerId1 = PublicKey.random();
  const peerId2 = PublicKey.random();

  const peer1 = new Teleport({ initiator: true, localPeerId: peerId1, remotePeerId: peerId2 });
  const peer2 = new Teleport({ initiator: false, localPeerId: peerId2, remotePeerId: peerId1 });

  pipeline(peer1.stream, peer2.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  pipeline(peer2.stream, peer1.stream, (err) => {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      log.catch(err);
    }
  });
  afterTest(() => peer1.close());
  afterTest(() => peer2.close());

  await Promise.all([peer1.open(), peer2.open()]);

  return { peer1, peer2 };
}

export const createReplicatorPair = async () => {
  const { peer1, peer2 } = await createStreamPair();

  const replicator1 = new ReplicatorExtension();
  peer1.addExtension('dxos.mesh.teleport.replicator', replicator1);

  const replicator2 = new ReplicatorExtension();
  peer2.addExtension('dxos.mesh.teleport.replicator', replicator2);

  return { replicator1, replicator2 };
};