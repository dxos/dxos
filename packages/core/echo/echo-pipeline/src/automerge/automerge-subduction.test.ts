//
// Copyright 2026 DXOS.org
//

import {
  AuthenticatedConnection,
  BlobMeta,
  Digest,
  MemorySigner,
  MemoryStorage,
  Message,
  Nonce,
  RequestId,
  SedimentreeId,
  Subduction,
  digestOfBase58Id,
  type PeerId as SubductionPeerId,
} from '@automerge/automerge-subduction';
import * as subductionModule from '@automerge/automerge-subduction';
import {
  Repo,
  generateAutomergeUrl,
  type PeerId,
  setSubductionModule,
  toDocumentId,
  toSedimentreeId,
} from '@automerge/automerge-repo';
import { describe, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';

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
 * Pure-JS HandshakeConnection backed by async queues.
 * Routes BatchSyncResponse messages to the matching call() waiter,
 * everything else goes to recv() for the WASM background loop.
 */
class MemoryConnection {
  private _outBytes: AsyncQueue<Uint8Array>;
  private _inBytes: AsyncQueue<Uint8Array>;
  private _outMsgs: AsyncQueue<Uint8Array>;
  private _rawInMsgs: AsyncQueue<Uint8Array>;
  private _peerId: SubductionPeerId;

  private _incomingMessages = new AsyncQueue<Message>();
  private _pendingCalls = new Map<string, (response: any) => void>();

  constructor(
    outBytes: AsyncQueue<Uint8Array>,
    inBytes: AsyncQueue<Uint8Array>,
    outMsgs: AsyncQueue<Uint8Array>,
    rawInMsgs: AsyncQueue<Uint8Array>,
    peerId: SubductionPeerId,
  ) {
    this._outBytes = outBytes;
    this._inBytes = inBytes;
    this._outMsgs = outMsgs;
    this._rawInMsgs = rawInMsgs;
    this._peerId = peerId;

    void this._routeIncoming();
  }

  /**
   * Background routing: reads raw incoming messages and dispatches them.
   * BatchSyncResponse messages are delivered to the matching call() waiter.
   * All other messages are delivered to recv().
   */
  private async _routeIncoming(): Promise<void> {
    while (true) {
      const bytes = await this._rawInMsgs.pull();
      const msg = Message.fromBytes(bytes);
      if (msg.response) {
        const nonce = msg.response.request_id().nonce.bytes;
        const key = Array.from(nonce).join(',');
        const resolve = this._pendingCalls.get(key);
        if (resolve) {
          this._pendingCalls.delete(key);
          resolve(msg.response);
        }
      } else {
        this._incomingMessages.push(msg);
      }
    }
  }

  async sendBytes(bytes: Uint8Array): Promise<void> {
    this._outBytes.push(new Uint8Array(bytes));
  }

  async recvBytes(): Promise<Uint8Array> {
    return this._inBytes.pull();
  }

  async send(message: Message): Promise<void> {
    this._outMsgs.push(message.toBytes());
  }

  async recv(): Promise<Message> {
    return this._incomingMessages.pull();
  }

  async nextRequestId(): Promise<RequestId> {
    return new RequestId(this._peerId, Nonce.random());
  }

  async call(request: any, _timeoutMs?: number | null): Promise<any> {
    const nonce = request.request_id().nonce.bytes;
    const key = Array.from(nonce).join(',');
    const responsePromise = new Promise<any>((resolve) => {
      this._pendingCalls.set(key, resolve);
    });
    await this.send(Message.batchSyncRequest(request));
    return responsePromise;
  }

  async disconnect(): Promise<void> {}
}

/**
 * Wraps MemoryStorage with event callbacks so the Repo receives commit-saved/fragment-saved
 * notifications when data arrives via the sync protocol.
 */
class CallbackStorage {
  private _inner = new MemoryStorage();
  private _listeners = new Map<string, Set<Function>>();
  private _pending = 0;
  private _settledResolvers: (() => void)[] = [];

  on(event: string, callback: Function) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function) {
    this._listeners.get(event)?.delete(callback);
  }

  async awaitSettled(): Promise<void> {
    if (this._pending === 0) return;
    return new Promise((resolve) => this._settledResolvers.push(resolve));
  }

  private _emit(event: string, ...args: any[]) {
    for (const cb of this._listeners.get(event) ?? []) {
      cb(...args);
    }
  }

  private _settle() {
    this._pending--;
    if (this._pending === 0) {
      for (const resolve of this._settledResolvers) resolve();
      this._settledResolvers = [];
    }
  }

  async saveCommit(sedimentreeId: any, digest: any, signedCommit: any, blob: Uint8Array) {
    this._pending++;
    await this._inner.saveCommit(sedimentreeId, digest, signedCommit, blob);
    this._emit('commit-saved', sedimentreeId, digest, blob);
    this._settle();
  }

  async saveFragment(sedimentreeId: any, digest: any, signedFragment: any, blob: Uint8Array) {
    this._pending++;
    await this._inner.saveFragment(sedimentreeId, digest, signedFragment, blob);
    this._emit('fragment-saved', sedimentreeId, digest, blob);
    this._settle();
  }

  saveSedimentreeId(id: any) { return this._inner.saveSedimentreeId(id); }
  deleteSedimentreeId(id: any) { return this._inner.deleteSedimentreeId(id); }
  loadAllSedimentreeIds() { return this._inner.loadAllSedimentreeIds(); }
  loadCommit(sid: any, digest: any) { return this._inner.loadCommit(sid, digest); }
  listCommitDigests(sid: any) { return this._inner.listCommitDigests(sid); }
  loadAllCommits(sid: any) { return this._inner.loadAllCommits(sid); }
  deleteCommit(sid: any, digest: any) { return this._inner.deleteCommit(sid, digest); }
  deleteAllCommits(sid: any) { return this._inner.deleteAllCommits(sid); }
  loadFragment(sid: any, digest: any) { return this._inner.loadFragment(sid, digest); }
  listFragmentDigests(sid: any) { return this._inner.listFragmentDigests(sid); }
  loadAllFragments(sid: any) { return this._inner.loadAllFragments(sid); }
  deleteFragment(sid: any, digest: any) { return this._inner.deleteFragment(sid, digest); }
  deleteAllFragments(sid: any) { return this._inner.deleteAllFragments(sid); }
}

const createMemoryConnectionPair = (
  peerIdA: SubductionPeerId,
  peerIdB: SubductionPeerId,
): [MemoryConnection, MemoryConnection] => {
  const bytesAB = new AsyncQueue<Uint8Array>();
  const bytesBA = new AsyncQueue<Uint8Array>();
  const msgsAB = new AsyncQueue<Uint8Array>();
  const msgsBA = new AsyncQueue<Uint8Array>();
  return [
    new MemoryConnection(bytesAB, bytesBA, msgsAB, msgsBA, peerIdA),
    new MemoryConnection(bytesBA, bytesAB, msgsBA, msgsAB, peerIdB),
  ];
};

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
    const signer = new MemorySigner();
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
    expect(() => digestOfBase58Id('contains-0')).toThrowError(/InvalidBase58Character/);
  });

  test('automerge-repo conversion helpers round-trip document IDs', ({ expect }) => {
    const url = generateAutomergeUrl();
    const sedimentreeId = toSedimentreeId(url);
    const documentId = toDocumentId(sedimentreeId);

    expect(documentId.length).toBeGreaterThan(0);
    expect(`automerge:${documentId}`).toBe(url);
  });

  test('automerge-repo accepts subduction instance and syncAllDocuments', async ({ expect }) => {
    setSubductionModule(subductionModule);

    const signer = MemorySigner.generate();
    const storage = new MemoryStorage();
    const subduction = new Subduction(signer, storage);
    const repo = new Repo({
      network: [],
      subduction,
    });

    const handle = repo.create<{ title?: string }>();
    handle.change((doc) => {
      doc.title = 'hello';
    });

    await expect(repo.syncAllDocuments()).resolves.toBeUndefined();

    await repo.shutdown();
  });

  test('establishes subduction connection and syncs via MessagePort', async ({ expect }) => {
    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const subductionA = new Subduction(signerA, new MemoryStorage());
    const subductionB = new Subduction(signerB, new MemoryStorage());

    const [connA, connB] = createMemoryConnectionPair(signerA.peerId(), signerB.peerId());

    const [authA, authB] = await Promise.all([
      AuthenticatedConnection.setup(connA, signerA, signerB.peerId()),
      AuthenticatedConnection.accept(connB, signerB),
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

  test('syncs between two repos via subduction connection', async ({ expect }) => {
    setSubductionModule(subductionModule);

    const signerA = MemorySigner.generate();
    const signerB = MemorySigner.generate();
    const storageA = new CallbackStorage();
    const storageB = new CallbackStorage();
    const subductionA = new Subduction(signerA, storageA);
    const subductionB = new Subduction(signerB, storageB);

    const [connA, connB] = createMemoryConnectionPair(signerA.peerId(), signerB.peerId());
    const [authA, authB] = await Promise.all([
      AuthenticatedConnection.setup(connA, signerA, signerB.peerId()),
      AuthenticatedConnection.accept(connB, signerB),
    ]);
    await subductionA.addConnection(authA);
    await subductionB.addConnection(authB);

    const repoA = new Repo({
      network: [],
      subduction: subductionA,
      periodicSyncInterval: 0,
      batchSyncInterval: 0,
    });
    const repoB = new Repo({
      network: [],
      subduction: subductionB,
      periodicSyncInterval: 0,
      batchSyncInterval: 0,
    });

    const hostHandle = repoA.create<{ text?: string }>();
    hostHandle.change((doc) => {
      doc.text = 'synced-via-subduction';
    });
    await repoA.awaitOutbound();

    const clientHandle = await repoB.find<{ text?: string }>(hostHandle.url);
    await asyncTimeout(clientHandle.whenReady(), 5_000);
    expect(clientHandle.doc()?.text).toBe('synced-via-subduction');

    const receivedSedimentreeId = toSedimentreeId(hostHandle.url);
    const commitsOnClient = await subductionB.getCommits(receivedSedimentreeId);
    expect(commitsOnClient?.length ?? 0).toBeGreaterThan(0);

    await repoA.shutdown();
    await repoB.shutdown();
  }, 10_000);
});
