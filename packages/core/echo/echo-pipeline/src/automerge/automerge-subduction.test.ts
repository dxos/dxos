//
// Copyright 2026 DXOS.org
//

import {
  AuthenticatedTransport,
  BlobMeta,
  Digest,
  MemorySigner,
  MemoryStorage,
  Nonce,
  SedimentreeId,
  Subduction,
  digestOfBase58Id,
  type PeerId as SubductionPeerId,
} from '@automerge/automerge-subduction';
import {
  Repo,
  generateAutomergeUrl,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { describe, test } from 'vitest';

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
    if (item !== undefined) return item;
    return new Promise<T>((resolve) => this._waiters.push(resolve));
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
  }

  onDisconnect(callback: () => void): void {
    this._disconnectCallbacks.push(callback);
  }
}

const createMemoryTransportPair = (): [MemoryTransport, MemoryTransport] => {
  const bytesAB = new AsyncQueue<Uint8Array>();
  const bytesBA = new AsyncQueue<Uint8Array>();
  return [
    new MemoryTransport(bytesAB, bytesBA),
    new MemoryTransport(bytesBA, bytesAB),
  ];
};

/**
 * Stateless subduction sync server.
 * Holds a Subduction instance with persistent storage but no Repo.
 * Connections are ephemeral: opened per sync session, torn down after.
 */
class SubductionServer {
  private _signer: MemorySigner;
  private _storage: MemoryStorage;
  private _subduction: Subduction;

  constructor(signer: MemorySigner) {
    this._signer = signer;
    this._storage = new MemoryStorage();
    this._subduction = new Subduction(signer, this._storage);
  }

  get peerId(): SubductionPeerId {
    return this._signer.peerId();
  }

  get subduction(): Subduction {
    return this._subduction;
  }

  /**
   * Opens an ephemeral sync session for a client.
   * Creates a MemoryTransport pair, performs the authenticated handshake,
   * and adds the server-side transport to the Subduction instance.
   * Returns the client-side AuthenticatedTransport for the caller to use.
   */
  async openSession(clientSigner: MemorySigner): Promise<AuthenticatedTransport> {
    const [serverTransport, clientTransport] = createMemoryTransportPair();

    const [serverAuth, clientAuth] = await Promise.all([
      AuthenticatedTransport.accept(serverTransport, this._signer),
      AuthenticatedTransport.setup(clientTransport, clientSigner, this._signer.peerId()),
    ]);

    await this._subduction.addConnection(serverAuth);
    return clientAuth;
  }

  /** Tears down the ephemeral connection for a client peer. */
  async closeSession(clientPeerId: SubductionPeerId): Promise<void> {
    await this._subduction.disconnectFromPeer(clientPeerId);
  }
}

describe('automerge-subduction', () => {
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
    const subduction = new Subduction(signer, storage);
    const id = SedimentreeId.fromBytes(new Uint8Array(32).fill(9));
    const blob = new Uint8Array([10, 11, 12]);

    const requestedFragment = await subduction.addCommit(id, [], blob);
    const commits = await subduction.getCommits(id);
    const blobs = await subduction.getBlobs(id);

    expect(requestedFragment).toBeUndefined();
    expect(commits).toBeDefined();
    expect(commits).toHaveLength(1);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toEqual(blob);
  });

  test('throws on invalid base58 input', ({ expect }) => {
    expect(() => digestOfBase58Id('contains-0')).toThrow();
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
      periodicSyncInterval: 0,
      batchSyncInterval: 0,
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
    const subductionA = new Subduction(signerA, new MemoryStorage());
    const subductionB = new Subduction(signerB, new MemoryStorage());

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
    await subductionA.addCommit(sid, [], new Uint8Array([1, 2, 3]));

    const result = await subductionA.syncWithAllPeers(sid, true);
    expect(result.entries().length).toBeGreaterThan(0);

    const blobsOnB = await subductionB.getBlobs(sid);
    expect(blobsOnB).toHaveLength(1);
  }, 10_000);

  test('syncs between two subduction instances using connectTransport', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction(signerA, new MemoryStorage(), 'test-service');
    const subductionB = new Subduction(signerB, new MemoryStorage(), 'test-service');

    const [transportA, transportB] = createMemoryTransportPair();

    const [peerIdB, peerIdA] = await Promise.all([
      subductionA.connectTransport(transportA, 'test-service'),
      subductionB.acceptTransport(transportB, 'test-service'),
    ]);

    expect(peerIdB.toString()).toBe(signerB.peerId().toString());
    expect(peerIdA.toString()).toBe(signerA.peerId().toString());

    const sid = SedimentreeId.fromBytes(new Uint8Array(32).fill(99));
    await subductionA.addCommit(sid, [], new Uint8Array([4, 5, 6]));

    await subductionA.syncWithAllPeers(sid, false);

    const blobsOnB = await subductionB.getBlobs(sid);
    expect(blobsOnB).toHaveLength(1);
    expect(blobsOnB[0]).toEqual(new Uint8Array([4, 5, 6]));
  }, 10_000);

  test('SubductionServer: syncs raw data between two clients via ephemeral connections', async ({ expect }) => {
    const server = new SubductionServer(MemorySigner.generate());

    // Client A adds a commit and syncs with the server.
    const signerA = MemorySigner.generate();
    const subductionA = new Subduction(signerA, new MemoryStorage());
    const sid = SedimentreeId.fromBytes(new Uint8Array(32).fill(42));
    await subductionA.addCommit(sid, [], new Uint8Array([1, 2, 3]));

    const clientAuthA = await server.openSession(signerA);
    await subductionA.addConnection(clientAuthA);
    await subductionA.syncWithAllPeers(sid, false);

    // Tear down Client A's session.
    await subductionA.disconnectFromPeer(server.peerId);
    await server.closeSession(signerA.peerId());

    // Server persisted the blob; no active connections remain.
    const serverBlobs = await server.subduction.getBlobs(sid);
    expect(serverBlobs).toHaveLength(1);
    expect(serverBlobs[0]).toEqual(new Uint8Array([1, 2, 3]));

    const serverPeersAfterA = await server.subduction.getConnectedPeerIds();
    expect(serverPeersAfterA).toHaveLength(0);

    // Client B opens a new session and retrieves the data from the server.
    const signerB = MemorySigner.generate();
    const subductionB = new Subduction(signerB, new MemoryStorage());

    const clientAuthB = await server.openSession(signerB);
    await subductionB.addConnection(clientAuthB);
    await subductionB.syncWithPeer(server.peerId, sid, false);

    const blobsOnB = await subductionB.getBlobs(sid);
    expect(blobsOnB).toHaveLength(1);
    expect(blobsOnB[0]).toEqual(new Uint8Array([1, 2, 3]));

    // Tear down Client B's session.
    await subductionB.disconnectFromPeer(server.peerId);
    await server.closeSession(signerB.peerId());

    const serverPeersAfterB = await server.subduction.getConnectedPeerIds();
    expect(serverPeersAfterB).toHaveLength(0);
  }, 10_000);

  test('full sync exchanges all sedimentrees between peers', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction(signerA, new MemoryStorage());
    const subductionB = new Subduction(signerB, new MemoryStorage());

    // Add commits on both sides before connecting.
    const sidA = SedimentreeId.fromBytes(new Uint8Array(32).fill(1));
    const sidB = SedimentreeId.fromBytes(new Uint8Array(32).fill(2));
    await subductionA.addCommit(sidA, [], new Uint8Array([10, 20]));
    await subductionB.addCommit(sidB, [], new Uint8Array([30, 40]));

    const [transportA, transportB] = createMemoryTransportPair();
    const [authA, authB] = await Promise.all([
      AuthenticatedTransport.setup(transportA, signerA, signerB.peerId()),
      AuthenticatedTransport.accept(transportB, signerB),
    ]);
    await subductionA.addConnection(authA);
    await subductionB.addConnection(authB);

    // Full sync exchanges everything.
    await subductionA.fullSyncWithPeer(signerB.peerId());
    await subductionB.fullSyncWithPeer(signerA.peerId());

    const blobsAonB = await subductionB.getBlobs(sidA);
    const blobsBonA = await subductionA.getBlobs(sidB);
    expect(blobsAonB).toHaveLength(1);
    expect(blobsAonB[0]).toEqual(new Uint8Array([10, 20]));
    expect(blobsBonA).toHaveLength(1);
    expect(blobsBonA[0]).toEqual(new Uint8Array([30, 40]));
  }, 10_000);
});
