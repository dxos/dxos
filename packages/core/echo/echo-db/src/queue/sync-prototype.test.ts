import { log } from '@dxos/log';
import { describe, expect, test } from 'vitest';

type ItemRecord = {
  /**
   * Global ID. Set by master sync server.
   */
  globalId: number | null;

  /**
   * Per peer sequence number.
   * Incremented by lamport-timestamp rules.
   * e.g. max(sequence) + 1
   * NOTE: Must be present if peerId is present.
   */
  sequence: number | null;

  /**
   * Peer ID.
   * NOTE: Must be present if sequence is present.
   */
  peerId: string | null;

  /**
   * Item data.
   */
  data: string;
};

type Range = {
  from?: number | null;
  to?: number | null;
};

type SyncMessage = {
  items: ItemRecord[];
};

class ItemStore {
  /**
   * Emulates sqlite table sorted by globalId.
   */
  private _items: ItemRecord[] = [];

  get items() {
    return this._items;
  }

  /**
   * Insert an item into the store and maintain sort order by globalId.
   */
  insert(items: ItemRecord[]) {
    for (const item of items) {
      // Check if there's already an item with the same peerId and sequence
      if (item.peerId !== null && item.sequence !== null) {
        const existingItemIndex = this._items.findIndex(
          (existing) => existing.peerId === item.peerId && existing.sequence === item.sequence,
        );

        if (existingItemIndex !== -1) {
          const existingItem = this._items[existingItemIndex];

          // If the existing item has a globalId and it's different from the new item's globalId
          if (existingItem.globalId !== null && item.globalId !== null && existingItem.globalId !== item.globalId) {
            throw new Error(
              `Conflict: Item with peerId=${item.peerId} and sequence=${item.sequence} already exists with different globalId`,
            );
          }

          // Update the existing item's globalId
          this._items[existingItemIndex].globalId = item.globalId;
          continue;
        }
      }

      // If no existing item with same peerId and sequence, add the new item
      this._items.push(item);
    }

    // Sort by globalId
    this._items.sort((a, b) => (a.globalId ?? Infinity) - (b.globalId ?? Infinity));
  }

  /**
   * Get items with globalId in the specified range.
   * @param range - Range object with optional from (inclusive) and to (exclusive)
   */
  get(range: Range = {}) {
    const { from = null, to = null } = range;
    return this._items.filter(
      (item) =>
        (from === null || (item.globalId !== null && item.globalId >= from)) &&
        (to === null || (item.globalId !== null && item.globalId <= to)),
    );
  }

  /**
   * Get local items without globalId.
   */
  getLocal() {
    return this._items.filter((item) => item.globalId === null);
  }

  /**
   * Get the last sequence number.
   * @returns -1 if no sequence numbers are present.
   */
  getLastSequenceNumber() {
    return this._items.reduce((max, item) => Math.max(max, item.sequence ?? 0), -1);
  }

  lastGlobalId() {
    for (let i = this._items.length - 1; i >= 0; i--) {
      if (this._items[i].globalId !== null) {
        return this._items[i].globalId;
      }
    }
    return null;
  }

  dump() {
    for (const item of this._items) {
      console.log(
        `${(item.globalId ?? '').toString().padEnd(3)} [${(item.peerId ?? '').padEnd(10)} ${(item.sequence ?? '').toString().padEnd(3)}] ${item.data}`,
      );
    }
  }
}

class SyncServer {
  /**
   * Store for items.
   */
  public _store = new ItemStore();

  acceptSyncMessage(message: SyncMessage) {
    let globalId = this._store.lastGlobalId() ?? -1;
    for (const item of message.items) {
      item.globalId = ++globalId;
      this._store.insert([item]);
    }
  }

  get(range: Range = {}) {
    return this._store.get(range);
  }
}

class Peer {
  /**
   * Store for items.
   */
  public _store = new ItemStore();

  constructor(public readonly id: string) {}

  append(data: string) {
    const items = this._store.getLocal();
    const nextSeq = this._store.getLastSequenceNumber() + 1;

    log('before append', { peer: this.id, data, nextSeq, items: this._store.items });
    this._store.insert([
      {
        globalId: null,
        sequence: nextSeq,
        peerId: this.id,
        data,
      },
    ]);
    log('after append', { peer: this.id, items: this._store.items });
  }

  get(range: Range = {}) {
    return this._store.get(range);
  }

  getSyncMessage(limit = 100): SyncMessage | null {
    const items = this._store.getLocal().slice(0, limit);
    if (items.length === 0) {
      return null;
    }
    return {
      items: structuredClone(items),
    };
  }

  syncTo(server: SyncServer) {
    log('before syncTo', { peer: this.id, items: this._store.items });
    const message = this.getSyncMessage();
    if (message) {
      log('syncTo', { peer: this.id, items: message.items.map((item) => item.data) });
      server.acceptSyncMessage(message);
    }
  }

  syncFrom(server: SyncServer) {
    log('before syncFrom', { peer: this.id, items: this._store.items });
    const lastGlobalId = this._store.lastGlobalId();
    const items = structuredClone(server.get({ from: lastGlobalId === null ? null : lastGlobalId + 1 }));
    // Assert every item has a globalId
    if (items.some((item) => item.globalId === null)) {
      throw new Error('Received items without globalId from server');
    }
    this._store.insert(items);
    log('syncFrom', { peer: this.id, lastGlobalId, items: items.map((item) => item.data) });
    log('after syncFrom', { peer: this.id, items: this._store.items });
  }
}

class Bench {
  public readonly server = new SyncServer();
  public readonly peers: Peer[] = [];

  addPeers(count: number) {
    for (let i = 0; i < count; i++) {
      this.peers.push(new Peer(`peer${this.peers.length + 1}`));
    }
  }

  syncPeer(peerIndex: number) {
    const peer = this.peers[peerIndex];
    peer.syncTo(this.server);
    peer.syncFrom(this.server);
  }

  syncAllPeers() {
    for (const peer of this.peers) {
      peer.syncTo(this.server);
    }
    for (const peer of this.peers) {
      peer.syncFrom(this.server);
    }
  }

  dumpAllPeers() {
    console.log('Server:');
    this.server._store.dump();
    for (const peer of this.peers) {
      console.log(`${peer.id}:`);
      peer._store.dump();
    }
  }
}

describe('queue sync prototype', () => {
  test('structuredClone of null is null', () => {
    // Verify that structuredClone preserves null values
    const original = null;
    const cloned = structuredClone(original);
    expect(cloned).toBeNull();

    // Verify that structuredClone preserves null properties
    const objWithNull = { prop: null };
    const clonedObj = structuredClone(objWithNull);
    expect(clonedObj.prop).toBeNull();

    // Verify that structuredClone preserves null in arrays
    const arrayWithNull = [1, null, 3];
    const clonedArray = structuredClone(arrayWithNull);
    expect(clonedArray[1]).toBeNull();
  });

  test('single peer sync', () => {
    const bench = new Bench();
    bench.addPeers(1);
    const peer = bench.peers[0];

    peer.append('msg1');
    peer.append('msg2');
    bench.syncPeer(0);

    // After sync, messages should have globalIds
    const items = peer.get();
    expect(items.length).toBe(2);
    expect(items.every((item) => item.globalId !== null)).toBe(true);
    expect(items[0].data).toBe('msg1');
    expect(items[1].data).toBe('msg2');
  });

  test('two peers sync maintains causal ordering', () => {
    const bench = new Bench();
    bench.addPeers(2);
    const [peer1, peer2] = bench.peers;

    // Peer 1 writes messages and syncs
    peer1.append('p1.msg1');
    peer1.append('p1.msg2');
    bench.syncPeer(0);

    // Peer 2 syncs and then writes messages
    bench.syncPeer(1);
    peer2.append('p2.msg1');
    peer2.append('p2.msg2');
    bench.syncPeer(1);

    // Check both peers have all messages in causal order
    bench.syncAllPeers();

    const peer1Items = peer1.get();
    const peer2Items = peer2.get();

    // Both peers should have same items in same order
    expect(peer1Items).toEqual(peer2Items);

    // Messages from peer1 should be before messages from peer2
    const peer1Messages = peer1Items.filter((item) => item.peerId === peer1.id);
    const peer2Messages = peer1Items.filter((item) => item.peerId === peer2.id);

    expect(peer1Messages[0].globalId).toBeLessThan(peer2Messages[0].globalId!);
    expect(peer1Messages[1].globalId).toBeLessThan(peer2Messages[0].globalId!);
  });

  test('two peers writing concurrently', () => {
    const bench = new Bench();
    bench.addPeers(2);
    const [peer1, peer2] = bench.peers;

    // Both peers write messages concurrently (before any sync)
    peer1.append('p1.msg1');
    peer1.append('p1.msg2');

    peer2.append('p2.msg1');
    peer2.append('p2.msg2');

    // Sync all peers
    bench.syncAllPeers();

    // Verify both peers have the same final state
    const peer1Items = peer1.get();
    const peer2Items = peer2.get();

    expect(peer1Items).toEqual(peer2Items);
    expect(peer1Items.length).toBe(4);

    // Verify messages from each peer are grouped together (not interleaved)
    const peer1Messages = peer1Items.filter((item) => item.peerId === peer1.id);
    const peer2Messages = peer1Items.filter((item) => item.peerId === peer2.id);

    expect(peer1Messages.length).toBe(2);
    expect(peer2Messages.length).toBe(2);

    // Verify all messages have global IDs assigned
    expect(peer1Items.every((item) => item.globalId !== null)).toBe(true);

    // Check that messages from the same peer are consecutive in the final order
    const peer1Indices = peer1Items
      .map((item, index) => (item.peerId === peer1.id ? index : -1))
      .filter((idx) => idx !== -1);
    const peer2Indices = peer1Items
      .map((item, index) => (item.peerId === peer2.id ? index : -1))
      .filter((idx) => idx !== -1);

    // Check if indices for each peer are consecutive
    for (let i = 1; i < peer1Indices.length; i++) {
      expect(peer1Indices[i]).toBe(peer1Indices[i - 1] + 1);
    }

    for (let i = 1; i < peer2Indices.length; i++) {
      expect(peer2Indices[i]).toBe(peer2Indices[i - 1] + 1);
    }
  });

  test('concurrent writes from offline peers', () => {
    const bench = new Bench();
    bench.addPeers(3);
    const [peer1, peer2, peer3] = bench.peers;

    // All peers start in sync
    peer1.append('initial');
    // bench.dumpAllPeers();

    bench.syncAllPeers();
    // log.break();
    // bench.dumpAllPeers();

    // Peers go "offline" and write independently
    peer1.append('p1.concurrent1');
    peer1.append('p1.concurrent2');

    peer2.append('p2.concurrent1');
    peer2.append('p2.concurrent2');

    peer3.append('p3.concurrent1');
    peer3.append('p3.concurrent2');

    // Sync all peers
    bench.syncAllPeers();
    // log.break();
    // bench.dumpAllPeers();

    // Verify all peers have same final state
    const peer1Items = peer1.get();
    const peer2Items = peer2.get();
    const peer3Items = peer3.get();

    expect(peer1Items).toEqual(peer2Items);
    expect(peer2Items).toEqual(peer3Items);

    // Verify messages from each peer are contiguous (not interleaved)
    const verifyContiguous = (items: ItemRecord[], peerId: string) => {
      const indices = items.map((item, index) => (item.peerId === peerId ? index : -1)).filter((index) => index !== -1);

      // Check if indices are consecutive
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBe(indices[i - 1] + 1);
      }
    };

    verifyContiguous(peer1Items, peer1.id);
    verifyContiguous(peer1Items, peer2.id);
    verifyContiguous(peer1Items, peer3.id);
  });

  test('large scale sync with many peers', () => {
    const bench = new Bench();
    const PEER_COUNT = 10;
    const MESSAGES_PER_PEER = 5;

    bench.addPeers(PEER_COUNT);

    // Each peer writes messages independently
    bench.peers.forEach((peer, i) => {
      for (let j = 0; j < MESSAGES_PER_PEER; j++) {
        peer.append(`p${i}.msg${j}`);
      }
    });

    // Random sync pattern to simulate real-world async sync
    for (let i = 0; i < PEER_COUNT * 2; i++) {
      const randomPeerIndex = Math.floor(Math.random() * PEER_COUNT);
      bench.syncPeer(randomPeerIndex);
    }

    // Final sync to ensure convergence
    bench.syncAllPeers();

    // Verify all peers have converged to same state
    const firstPeerItems = bench.peers[0].get();
    bench.peers.slice(1).forEach((peer) => {
      const peerItems = peer.get();
      expect(peerItems).toEqual(firstPeerItems);
    });

    // Verify total message count
    expect(firstPeerItems.length).toBe(PEER_COUNT * MESSAGES_PER_PEER);

    // Verify messages from each peer are contiguous
    bench.peers.forEach((peer) => {
      const peerMessages = firstPeerItems.filter((item) => item.peerId === peer.id);
      expect(peerMessages.length).toBe(MESSAGES_PER_PEER);

      // Verify sequence numbers are consecutive
      for (let i = 1; i < MESSAGES_PER_PEER; i++) {
        expect(peerMessages[i].sequence).toBe(peerMessages[i - 1].sequence! + 1);
      }
    });
  });
});
