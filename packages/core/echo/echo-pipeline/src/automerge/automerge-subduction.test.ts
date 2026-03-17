//
// Copyright 2026 DXOS.org
//

import {
  BlobMeta,
  Digest,
  MemorySigner,
  MemoryStorage,
  Nonce,
  SedimentreeId,
  Subduction,
  digestOfBase58Id,
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

import { asyncTimeout, sleep } from '@dxos/async';

import { TestAdapter } from '../testing';

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

  test('syncs between two repos over memory network with subduction enabled', async ({ expect }) => {
    setSubductionModule(subductionModule);

    const [adapterA, adapterB] = TestAdapter.createPair();
    const subductionA = new Subduction(MemorySigner.generate(), new MemoryStorage());
    const subductionB = new Subduction(MemorySigner.generate(), new MemoryStorage());

    const repoA = new Repo({
      peerId: 'peer-a' as PeerId,
      network: [adapterA],
      subduction: subductionA,
      periodicSyncInterval: 0,
      batchSyncInterval: 0,
    });
    const repoB = new Repo({
      peerId: 'peer-b' as PeerId,
      network: [adapterB],
      subduction: subductionB,
      periodicSyncInterval: 0,
      batchSyncInterval: 0,
    });

    await adapterA.onConnect.wait();
    await adapterB.onConnect.wait();
    adapterA.peerCandidate(adapterB.peerId!);
    adapterB.peerCandidate(adapterA.peerId!);

    const hostHandle = repoA.create<{ text?: string }>();
    hostHandle.change((doc) => {
      doc.text = 'synced-through-memory-network';
    });

    const clientHandle = await repoB.find<{ text?: string }>(hostHandle.url);
    await asyncTimeout(clientHandle.whenReady(), 2_000);
    expect(clientHandle.doc()?.text).toBe('synced-through-memory-network');

    await sleep(150);
    const receivedSedimentreeId = toSedimentreeId(hostHandle.url);
    const commitsOnClient = await subductionB.getCommits(receivedSedimentreeId);
    expect(commitsOnClient?.length ?? 0).toBeGreaterThan(0);

    await repoA.shutdown();
    await repoB.shutdown();
  });
});
