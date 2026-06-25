//
// Copyright 2026 DXOS.org
//

import { Repo, generateAutomergeUrl, initSubduction, parseAutomergeUrl } from '@automerge/automerge-repo';
import {
  AuthenticatedTransport,
  BlobMeta,
  CommitId,
  Digest,
  MemorySigner,
  MemoryStorage,
  Nonce,
  SedimentreeId,
  Subduction,
  commitIdOfBase58Id,
} from '@automerge/automerge-subduction';
import { beforeAll, describe, test } from 'vitest';

import { sleep } from '@dxos/async';

class AsyncQueue<T> {
  private _items: T[] = [];
  private _waiters: ((item: T) => void)[] = [];

  push(item: T): void {
    const waiter = this._waiters.shift();
    if (waiter) {
      waiter(item);
    } else {
      this._items.push(item);
    }
  }

  async pull(): Promise<T> {
    const item = this._items.shift();
    if (item !== undefined) {
      return item;
    }
    return new Promise<T>((resolve) => this._waiters.push(resolve));
  }

  clear(): void {
    this._items.length = 0;
    this._waiters.length = 0;
  }
}

/**
 * Pure-JS transport backed by async queues.
 * Implements the subduction Transport interface for in-memory testing.
 */
class MemoryTransport {
  private _outBytes: AsyncQueue<Uint8Array>;
  private _inBytes: AsyncQueue<Uint8Array>;
  private _disconnectCallbacks: (() => void)[] = [];

  constructor(outBytes: AsyncQueue<Uint8Array>, inBytes: AsyncQueue<Uint8Array>) {
    this._outBytes = outBytes;
    this._inBytes = inBytes;
  }

  async sendBytes(bytes: Uint8Array): Promise<void> {
    this._outBytes.push(new Uint8Array(bytes));
  }

  async recvBytes(): Promise<Uint8Array> {
    return this._inBytes.pull();
  }

  async disconnect(): Promise<void> {
    for (const callback of this._disconnectCallbacks) {
      callback();
    }
    this._inBytes.clear();
    this._outBytes.clear();
  }

  onDisconnect(callback: () => void): void {
    this._disconnectCallbacks.push(callback);
  }
}

const createMemoryTransportPair = (): [MemoryTransport, MemoryTransport] => {
  const bytesAB = new AsyncQueue<Uint8Array>();
  const bytesBA = new AsyncQueue<Uint8Array>();
  return [new MemoryTransport(bytesAB, bytesBA), new MemoryTransport(bytesBA, bytesAB)];
};

/**
 * Build a deterministic {@link CommitId} seeded by a small integer. Values are arbitrary;
 * used in tests only to satisfy the `head` parameter of `Subduction.addCommit`.
 */
const commitIdOf = (seed: number): CommitId => CommitId.fromBytes(new Uint8Array(32).fill(seed));

// TODO(mykola): subduction wasm/network tests are flaky on CI runners
// (limited concurrency, signal-server timing). Re-enable once the suite
// is stable in CI.
describe.skipIf(process.env.CI)('automerge-subduction', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('creates signer and signs payloads', async ({ expect }) => {
    const signer = MemorySigner.generate();
    const signature = await signer.sign(new Uint8Array([1, 2, 3]));
    const verifyingKey = signer.verifyingKey();
    const peerId = signer.peerId();

    expect(signature).toBeInstanceOf(Uint8Array);
    expect(signature.length).toBe(64);
    expect(verifyingKey).toBeInstanceOf(Uint8Array);
    expect(verifyingKey.length).toBe(32);
    expect(peerId.toString().length).toBeGreaterThan(0);
  });

  test('round-trips digest bytes and hex', ({ expect }) => {
    const digestBytes = new Uint8Array(32).fill(2);
    const digest = Digest.fromBytes(digestBytes);
    const fromHex = Digest.fromHexString(digest.toHexString());

    expect(digest.toBytes()).toEqual(digestBytes);
    expect(digest.toHexString()).toHaveLength(64);
    expect(fromHex.toBytes()).toEqual(digestBytes);
  });

  test('nonce random bytes are fixed-width', ({ expect }) => {
    const nonce = Nonce.random();
    expect(nonce.bytes.length).toBe(8);
  });

  test('blob meta reports digest and size', ({ expect }) => {
    const blobMeta = new BlobMeta(new Uint8Array([5, 6, 7, 8]));
    expect(blobMeta.sizeBytes).toBe(4n);
    expect(blobMeta.digest().toBytes().length).toBe(32);
  });

  test('stores and loads sedimentree IDs in memory storage', async ({ expect }) => {
    const storage = new MemoryStorage();
    const id = SedimentreeId.fromBytes(new Uint8Array(32).fill(7));

    await storage.saveSedimentreeId(id);
    const ids = await storage.loadAllSedimentreeIds();

    expect(ids).toHaveLength(1);
    expect(ids[0].toBytes()).toEqual(id.toBytes());
  });

  test('adds a commit and exposes it through subduction read APIs', async ({ expect }) => {
    const signer = MemorySigner.generate();
    const storage = new MemoryStorage();
    const subduction = new Subduction({ signer, storage });
    const id = SedimentreeId.fromBytes(new Uint8Array(32).fill(9));
    const blob = new Uint8Array([10, 11, 12]);

    const requestedFragment = await subduction.addCommit(id, commitIdOf(1), [], blob);
    const commits = await subduction.getCommits(id);
    const blobs = await subduction.getBlobs(id);

    expect(requestedFragment).toBeUndefined();
    expect(commits).toBeDefined();
    expect(commits).toHaveLength(1);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toEqual(blob);
  });

  test('throws on invalid base58 input', ({ expect }) => {
    expect(() => commitIdOfBase58Id('contains-0')).toThrow();
  });

  test('automerge-repo URL helpers round-trip document IDs', ({ expect }) => {
    const url = generateAutomergeUrl();
    const parsed = parseAutomergeUrl(url);

    expect(parsed.documentId.length).toBeGreaterThan(0);
    expect(`automerge:${parsed.documentId}`).toBe(url);
  });

  test('automerge-repo creates documents with subduction signer', async ({ expect }) => {
    const signer = MemorySigner.generate();
    const repo = new Repo({
      network: [],
      signer,
    });

    const handle = repo.create<{ title?: string }>();
    handle.change((doc) => {
      doc.title = 'hello';
    });

    expect(handle.doc()?.title).toBe('hello');
    await repo.shutdown();
  });

  test('establishes subduction connection and syncs via AuthenticatedTransport', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction({ signer: signerA, storage: new MemoryStorage() });
    const subductionB = new Subduction({ signer: signerB, storage: new MemoryStorage() });

    const [transportA, transportB] = createMemoryTransportPair();

    const [authA, authB] = await Promise.all([
      AuthenticatedTransport.setup(transportA, signerA, signerB.peerId()),
      AuthenticatedTransport.accept(transportB, signerB),
    ]);

    await subductionA.addConnection(authA);
    await subductionB.addConnection(authB);

    const peersA = await subductionA.getConnectedPeerIds();
    const peersB = await subductionB.getConnectedPeerIds();
    expect(peersA).toHaveLength(1);
    expect(peersB).toHaveLength(1);

    const sid = SedimentreeId.fromBytes(new Uint8Array(32).fill(42));
    await subductionA.addCommit(sid, commitIdOf(2), [], new Uint8Array([1, 2, 3]));

    const result = await subductionA.syncWithAllPeers(sid, true);
    expect(result.entries().length).toBeGreaterThan(0);

    const blobsOnB = await subductionB.getBlobs(sid);
    expect(blobsOnB).toHaveLength(1);
  }, 10_000);

  test('syncs between two subduction instances using connectTransport', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction({ signer: signerA, storage: new MemoryStorage(), serviceName: 'test-service' });
    const subductionB = new Subduction({ signer: signerB, storage: new MemoryStorage(), serviceName: 'test-service' });

    const [transportA, transportB] = createMemoryTransportPair();

    const [peerIdB, peerIdA] = await Promise.all([
      subductionA.connectTransport(transportA, 'test-service'),
      subductionB.acceptTransport(transportB, 'test-service'),
    ]);

    expect(peerIdB.toString()).toBe(signerB.peerId().toString());
    expect(peerIdA.toString()).toBe(signerA.peerId().toString());

    const sid = SedimentreeId.fromBytes(new Uint8Array(32).fill(99));
    await subductionA.addCommit(sid, commitIdOf(3), [], new Uint8Array([4, 5, 6]));

    await subductionA.syncWithAllPeers(sid, false);

    const blobsOnB = await subductionB.getBlobs(sid);
    expect(blobsOnB).toHaveLength(1);
    expect(blobsOnB[0]).toEqual(new Uint8Array([4, 5, 6]));
  }, 10_000);

  test('full sync exchanges all sedimentrees between peers', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction({ signer: signerA, storage: new MemoryStorage() });
    const subductionB = new Subduction({ signer: signerB, storage: new MemoryStorage() });

    const sidA = SedimentreeId.fromBytes(new Uint8Array(32).fill(1));
    const sidB = SedimentreeId.fromBytes(new Uint8Array(32).fill(2));

    const [transportA, transportB] = createMemoryTransportPair();
    const [authA, authB] = await Promise.all([
      AuthenticatedTransport.setup(transportA, signerA, signerB.peerId()),
      AuthenticatedTransport.accept(transportB, signerB),
    ]);
    await subductionA.addConnection(authA);
    await subductionB.addConnection(authB);

    // Commits are added after connecting: a sedimentree present before
    // `addConnection` is not picked up by a later full sync, so seed both
    // sides on the live connection. A single `fullSyncWithAllPeers` then
    // exchanges fingerprints bidirectionally — each peer ends up with both.
    await subductionA.addCommit(sidA, commitIdOf(5), [], new Uint8Array([10, 20]));
    await subductionB.addCommit(sidB, commitIdOf(6), [], new Uint8Array([30, 40]));
    await subductionA.fullSyncWithAllPeers();

    const blobsAonB = await subductionB.getBlobs(sidA);
    const blobsBonA = await subductionA.getBlobs(sidB);
    expect(blobsAonB).toHaveLength(1);
    expect(blobsAonB[0]).toEqual(new Uint8Array([10, 20]));
    expect(blobsBonA).toHaveLength(1);
    expect(blobsBonA[0]).toEqual(new Uint8Array([30, 40]));
  }, 10_000);

  // After B drops handshake state and rehydrates from durable storage, does
  // subduction re-handshake on the reused logical channel when A pushes?
  // Empirical answer: no — A's auto-broadcast does not reach B'.
  test(
    'does not auto-rehydrate handshake on a logical connection where one end dropped it',
    { timeout: 15_000 },
    async ({ expect }) => {
      const signerA = MemorySigner.generate();
      const signerB = MemorySigner.generate();
      const storageA = new MemoryStorage();
      const storageB = new MemoryStorage();
      const [transportA, transportB] = createMemoryTransportPair();

      const subA = new Subduction({ signer: signerA, storage: storageA, serviceName: 'svc' });
      let subB = new Subduction({ signer: signerB, storage: storageB, serviceName: 'svc' });

      const [authA, authB] = await Promise.all([
        AuthenticatedTransport.setup(transportA, signerA, signerB.peerId()),
        AuthenticatedTransport.accept(transportB, signerB),
      ]);
      await subA.addConnection(authA);
      await subB.addConnection(authB);

      const sid = SedimentreeId.fromBytes(new Uint8Array(32).fill(7));
      await subA.addCommit(sid, commitIdOf(1), [], new Uint8Array([1, 2, 3]));
      await expect.poll(() => subB.getBlobs(sid).then((bs) => bs.length), { timeout: 5_000 }).toEqual(1);

      // Simulate B crash: clearing the queue's waiters halts the orphaned
      // wasm pump that survives `free()`. Do NOT use `disconnectAll` /
      // `disconnectFromPeer` — those send a graceful goodbye A would observe.
      await transportB.disconnect();
      subB.free();

      subB = new Subduction({ signer: signerB, storage: storageB, serviceName: 'svc' });
      expect(await subB.getBlobs(sid)).toHaveLength(1);
      expect(await subB.getConnectedPeerIds()).toHaveLength(0);
      expect(await subA.getConnectedPeerIds()).toHaveLength(1);

      await subA.addCommit(sid, commitIdOf(2), [commitIdOf(1)], new Uint8Array([4, 5, 6]));
      await sleep(500);

      // TODO(mykola): When subduction-core grows channel-level handshake
      // recovery, flip to `.toHaveLength(2)` and drop "does not" from name.
      expect(await subB.getBlobs(sid)).toHaveLength(1);

      subA.free();
      subB.free();
    },
  );
});
