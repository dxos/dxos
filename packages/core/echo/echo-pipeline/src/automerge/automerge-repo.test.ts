//
// Copyright 2024 DXOS.org
//

import {
  next as A,
  type Heads,
  change,
  clone,
  equals,
  from,
  getBackend,
  getHeads,
  save,
  saveSince,
} from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type HandleState,
  type Message,
  type PeerId,
  Repo,
  type SharePolicy,
  type StorageAdapterInterface,
  generateAutomergeUrl,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { openAndClose } from '@dxos/test-utils';
import { isNonNullable, range } from '@dxos/util';

import { TestAdapter, type TestConnectionStateProvider } from '../testing';

import { FIND_PARAMS } from './automerge-host';
import { EchoNetworkAdapter } from './echo-network-adapter';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { MeshEchoReplicator } from './mesh-echo-replicator';

const HOST_AND_CLIENT: [string, string] = ['host', 'client'];

describe('AutomergeRepo', () => {
  test('change events', () => {
    const repo = new Repo({ network: [] });
    const handle = repo.create<{ field?: string }>();

    let valueDuringChange: string | undefined;

    handle.addListener('change', (doc) => {
      valueDuringChange = handle.doc()!.field;
    });

    handle.change((doc: any) => {
      doc.field = 'value';
    });

    expect(valueDuringChange).to.eq('value');
  });

  test('flush', async () => {
    const storage = await createLevelAdapter();

    const repo = new Repo({
      network: [],
      storage,
    });
    const handle = repo.create<{ field?: string }>();

    for (let i = 0; i < 10; i++) {
      const p = repo.flush([handle.documentId]);
      handle.change((doc: any) => {
        doc.field += randomBytes(1024).toString('hex');
      });
      await p;
    }
  });

  test('getChangeByHash', async () => {
    const doc = from({ foo: 'bar' });
    const copy = clone(doc);
    const newDoc = change(copy, 'change', (doc: any) => {
      doc.foo = 'baz';
    });

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(newDoc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.not.be.null;
    }

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(doc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.be.null;
    }
  });

  test('heads equality', () => {
    const a: Heads = getHeads(from({ foo: 'bar' }));
    const b: Heads = getHeads(from({ foo: 'bar' }));
    const c: Heads = [...a];

    expect(equals(a, b)).to.be.false;
    expect(equals(a, c)).to.be.true;
  });

  test('documents missing from local storage go to requesting state', async () => {
    const { repos, adapters } = await createHostClientRepoTopology();
    const [host] = repos;
    await connectAdapters(adapters);
    const url = 'automerge:3JN8F3Z4dUWEEKKFN7WE9gEGvVUT';
    const handle = await host.find(url as AutomergeUrl, FIND_PARAMS);
    await handle.whenReady(['requesting']);
  });

  test('documents on disk go to ready state', async () => {
    const storage = await createLevelAdapter();

    let url: AutomergeUrl | undefined;
    {
      const repo = new Repo({ network: [], storage });
      const handle = repo.create<{ field?: string }>();
      url = handle.url;
      await repo.flush();
    }

    {
      const repo = new Repo({ network: [], storage });
      const handle = await repo.find(url as AutomergeUrl);

      let requestingState = false;
      queueMicrotask(async () => {
        await handle.whenReady(['requesting']);
        requestingState = true;
      });

      await handle.whenReady(['ready']);
      expect(requestingState).to.be.false;
    }
  });

  describe('network', () => {
    test('basic networking', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create();
      const text = 'Hello world';
      handle.change((doc: any) => {
        doc.text = text;
      });

      expect((await asyncTimeout(client.find<any>(handle.url), 1000))!.doc().text).to.equal(text);
    });

    test('two documents and share policy switching', async () => {
      const allowedDocs: DocumentId[] = [];

      const { repos, adapters } = await createHostClientRepoTopology({
        sharePolicy: async (peerId, docId): Promise<boolean> => {
          if (peerId === 'host') {
            return docId ? allowedDocs.includes(docId) && !!client.handles[docId] : false;
          } else {
            return docId ? allowedDocs.includes(docId) && !!host.handles[docId] : false;
          }
        },
      });
      const [host, client] = repos;

      const firstHandle = host.create();
      firstHandle.change((doc: any) => (doc.text = 'Hello world'));
      await host.find(firstHandle.url);
      allowedDocs.push(firstHandle.documentId);

      await connectAdapters(adapters);

      {
        const firstDocOnClient = await client.find<any>(firstHandle.url);
        await asyncTimeout(firstDocOnClient.whenReady(), 1000);
        expect(firstDocOnClient.doc()!.text).to.equal('Hello world');
      }

      const secondHandle = host.create();
      secondHandle.change((doc: any) => (doc.text = 'Hello world'));
      await host.find(secondHandle.url);
      allowedDocs.push(secondHandle.documentId);

      {
        const secondDocOnClient = await client.find<any>(secondHandle.url);
        await asyncTimeout(secondDocOnClient.whenReady(), 1000);
        expect(secondDocOnClient.doc()!.text).to.equal('Hello world');
      }
    });

    test('recovering from a lost connection', async () => {
      let connectionState: 'on' | 'off' = 'on';

      const { repos, adapters } = await createHostClientRepoTopology({
        connectionStateProvider: () => connectionState,
      });
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create();
      const docOnClient = await client.find<any>(handle.url, FIND_PARAMS);
      {
        const sanityText = 'Hello world';
        handle.change((doc: any) => {
          doc.sanityText = sanityText;
        });
        await asyncTimeout(docOnClient.whenReady(), 1000);

        expect(docOnClient.doc().sanityText).to.equal(sanityText);
      }

      // Disrupt connection.
      const offlineText = 'This has been written while the connection was off';
      {
        connectionState = 'off';

        handle.change((doc: any) => {
          doc.offlineText = offlineText;
        });

        await sleep(100);
        await asyncTimeout(docOnClient.whenReady(), 1000);
        expect(docOnClient.doc().offlineText).to.be.undefined;
      }

      // Re-establish connection.
      const onlineText = 'This has been written after the connection was re-established';
      {
        connectionState = 'on';
        await reconnectAdapters(adapters);

        handle.change((doc: any) => {
          doc.onlineText = onlineText;
        });
        await sleep(100);
        await asyncTimeout(docOnClient.whenReady(), 1000);
        expect(docOnClient.doc().onlineText).to.equal(onlineText);
        expect(docOnClient.doc().offlineText).to.equal(offlineText);
      }
    });

    test('replication though a 4 peer chain', async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C', 'D'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'D'],
        ],
      });
      const [repoA, _, __, repoD] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create();
      // NOTE: Doesn't work if the doc is empty.
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });

      // If we wait here for replication to finish naturally, the test will pass.

      const docD = await repoD.find(docA.url);

      await asyncTimeout(docD.whenReady(), 1000);
    });

    test('replication though a 3 peer chain', async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
        ],
      });
      const [repoA, repoB, repoC] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create();
      // NOTE: Doesn't work if the doc is empty.
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });

      const _ = repoB.find(docA.url, FIND_PARAMS);
      const docC = await repoC.find(docA.url, FIND_PARAMS);
      await asyncTimeout(docC.whenReady(), 1000);
    });

    test('replicate document after request', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [host, client] = repos;
      const [[adapter1, adapter2]] = adapters;

      const unavailable: HandleState = 'unavailable';
      await connectAdapters(adapters, { noEmitPeerCandidate: true });

      const docA = host.create();
      // NOTE: Doesn't work if the doc is empty.
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });

      const docB = await client.find(docA.url, { allowableStates: ['unavailable'] });

      // Request document from repoB.
      await asyncTimeout(docB.whenReady([unavailable]), 1_000);

      adapter1.peerCandidate(adapter2.peerId!);
      await sleep(100);
      adapter2.peerCandidate(adapter1.peerId!);

      // Wait becomes unavailable.
      await asyncTimeout(docB.whenReady([unavailable]), 1_000);

      // Wait gets loaded after reconnect.
      await reconnectAdapters(adapters);
      await asyncTimeout(docB.whenReady(), 1_000);
    });

    test('documents loaded from disk get replicated', async () => {
      const storage = await createLevelAdapter();

      let url: AutomergeUrl | undefined;
      {
        const peer1 = new Repo({
          storage,
        });
        const handle = peer1.create({ text: 'foo' });
        await peer1.flush();
        url = handle.url;
      }

      const { repos, adapters } = await createHostClientRepoTopology({ storages: [storage] });
      const [peer1, peer2] = repos;
      await connectAdapters(adapters);

      // Load doc on peer1
      const hostHandle = await peer1.find<any>(url as AutomergeUrl);

      // Doc should be pushed to peer2
      await hostHandle.whenReady();
      await expect.poll(() => hostHandle.doc()!.text).not.toBeUndefined();
      await expect.poll(() => peer2.handles[hostHandle.documentId].doc()).toEqual(hostHandle.doc());
    });

    test('client cold-starts and syncs doc from a Repo', async () => {
      const repo = new Repo({ network: [] });
      const serverHandle = repo.create<{ field?: string }>();

      let clientDoc = A.from<{ field?: string }>({});
      const receiveByClient = (blob: Uint8Array) => {
        clientDoc = A.loadIncremental(clientDoc, blob);
      };

      // Sync handshake.
      let syncedHeads = getHeads(serverHandle.doc()!);
      receiveByClient(save(serverHandle.doc()!));

      serverHandle.on('change', ({ doc }) => {
        // Note: This is mock of a sync protocol between client and server.
        const blob = saveSince(doc, syncedHeads);
        syncedHeads = getHeads(doc);
        receiveByClient(blob);
      });

      {
        const value = 'text to test if sync works';
        serverHandle.change((doc: any) => {
          doc.field = value;
        });
        expect(clientDoc.field).to.deep.equal(value);
      }

      {
        const value = 'test if updates propagate';
        serverHandle.change((doc: any) => {
          doc.field = value;
        });
        expect(clientDoc.field).to.deep.equal(value);
      }
    });

    test('client creates doc and syncs with a Repo', async () => {
      const repo = new Repo({ network: [] });
      const receiveByServer = (blob: Uint8Array, docId: DocumentId) => repo.import<any>(blob, { docId });
      let clientDoc = A.from<{ field?: string }>({});
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      // Sync handshake.
      let sentHeads: Heads = [];

      // Sync protocol.
      const sendDoc = async (doc: A.Doc<any>) => {
        receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      {
        // Change doc and send changes to server.
        const value = 'text to test if sync works';
        clientDoc = A.change(clientDoc, (doc: any) => {
          doc.field = value;
        });
        await sendDoc(clientDoc);

        const serverHandle = await repo.find<any>(documentId);
        expect(serverHandle.doc()!.field).to.deep.equal(value);
      }
    });

    test('client creates doc and Repo persists it to disk', async () => {
      const storage = await createLevelAdapter();

      const repo = new Repo({ network: [], storage });
      const receiveByServer = async (blob: Uint8Array, docId: DocumentId) => {
        repo.import<any>(blob, { docId });
        // TODO(mykola): This should not be required. Document is not persisted without it.
        await repo.flush([docId]);
      };

      let clientDoc = A.from<{ field?: string }>({ field: 'foo' });
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      // Sync handshake.
      let sentHeads: Heads = [];

      // Sync protocol.
      const sendDoc = async (doc: A.Doc<any>) => {
        await receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      // Change doc and send changes to server.
      const value = 'text to test if sync works';
      {
        clientDoc = A.change(clientDoc, (doc: any) => {
          doc.field = value;
        });
        await sendDoc(clientDoc);

        const serverHandle = await repo.find<any>(documentId);
        expect(serverHandle.doc()!.field).to.deep.equal(value);
      }

      await sleep(100);

      // Re-open repo.
      {
        const repo = new Repo({ network: [], storage });
        const serverHandle = await repo.find<any>(documentId);
        expect(serverHandle.doc()!.field).to.deep.equal(value);
      }
    });

    test('two repo sync docs on `update` call', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [repoA, repoB] = repos;
      await connectAdapters(adapters);

      const handleA = repoA.create<any>();
      const handleB = await repoB.find<any>(handleA.url);

      const text = 'Hello world';
      handleA.update((doc: any) => {
        return A.change(doc, (doc: any) => {
          doc.text = text;
        });
      });

      expect(handleA.doc()!.text).to.equal(text);

      await sleep(100);
      await asyncTimeout(handleB.whenReady(), 1000);
      expect(handleB.doc()!.text).to.equal(text);
    });

    test('retry share config', async () => {
      let announce = false;

      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B'],
        connections: [['A', 'B']],
        options: {
          shareConfig: {
            access: async () => true,
            announce: async () => announce,
          },
        },
        onMessage: (message) => {
          console.log(`${message.senderId} -> ${message.targetId}: ${message.type} ${message.documentId ?? ''}`);
        },
      });
      const [repoA, repoB] = repos;
      await connectAdapters(adapters);
      console.log({ peersA: repoA.peers, peersB: repoB.peers });

      const docA = repoA.create({ text: 'Hello world' });

      const docB = await repoB.find(docA.url, { allowableStates: ['ready', 'unavailable'] });
      expect(docB.state).to.equal('unavailable');
      log.info('unavailable');

      announce = true;
      repoB.shareConfigChanged();
      await docB.whenReady();
    });
  });

  describe('create2 tests', () => {
    test('basic document creation', async () => {
      const repo = new Repo({ network: [] });

      const handle = await repo.create2<{ text: string }>();
      expect(handle.doc()).to.deep.equal({});

      handle.change((doc: any) => {
        doc.text = 'Hello World';
      });

      expect(handle.doc()?.text).to.equal('Hello World');
    });

    test('document mutation', async () => {
      const repo = new Repo({ network: [] });

      const handle = await repo.create2<{ counter: number }>({ counter: 0 });

      for (let i = 1; i <= 10; i++) {
        handle.change((doc: any) => {
          doc.counter = i;
        });
      }

      expect(handle.doc()?.counter).to.equal(10);
    });

    test('import document and mutate', async () => {
      const repo = new Repo({ network: [] });

      const original = await repo.create2<{ text: string }>({ text: 'original' });
      const blob = A.save(original.doc()!);

      const imported = repo.import<{ text: string }>(blob);
      expect(imported.doc()?.text).to.equal('original');

      imported.change((doc: any) => {
        doc.text = 'mutated';
      });
      expect(imported.doc()?.text).to.equal('mutated');
    });

    test('reload document with flush', async () => {
      const path = createTmpPath();
      const text = 'Hello World!';
      let url: AutomergeUrl;

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = new Repo({ network: [], storage });
        const handle = await repo.create2<{ text: string }>();
        url = handle.url;
        handle.change((doc: any) => {
          doc.text = text;
        });
        await repo.flush([handle.documentId]);
        await level.close();
      }

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = new Repo({ network: [], storage });
        const handle = await repo.find<{ text: string }>(url);
        await handle.whenReady();
        expect(handle.doc()?.text).to.equal(text);
        await level.close();
      }
    });

    test('reload document without flush', async () => {
      const path = createTmpPath();
      const text = 'Hello World!';
      let url: AutomergeUrl;

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = new Repo({ network: [], storage });
        const handle = await repo.create2<{ text: string }>();
        url = handle.url;
        handle.change((doc: any) => {
          doc.text = text;
        });
        // No explicit flush - rely on auto-save.
        await sleep(200);
        await level.close();
      }

      {
        const level = createTestLevel(path);
        const storage = await createLevelAdapter(level);
        const repo = new Repo({ network: [], storage });
        const handle = await repo.find<{ text: string }>(url);
        await handle.whenReady();
        expect(handle.doc()?.text).to.equal(text);
      }
    });
  });

  describe('teleport', () => {
    test('integration test with teleport', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peer1 = await createTeleportTestPeer(teleportBuilder, spaceKey);
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey);

      const handle = peer1.repo.create();
      {
        // Initiate connection and test the connection.
        await connectPeers(spaceKey, teleportBuilder, peer1, peer2);
        const text = 'Hello world';
        handle.change((doc: any) => {
          doc.text = text;
        });
        await expect
          .poll(
            async () => {
              const docOnPeer2 = await peer2.repo.find<any>(handle.url);
              return docOnPeer2.doc()!.text;
            },
            { timeout: 5_000 },
          )
          .toEqual(text);
      }

      const offlineText = 'This has been written while the connection was off';
      {
        // Disconnect peers and make offline changes.
        await teleportBuilder.disconnect(peer1.teleport, peer2.teleport);
        const offlineText = 'This has been written while the connection was off';
        handle.change((doc: any) => {
          doc.offlineText = offlineText;
        });
        const docOnPeer2 = await peer2.repo.find<any>(handle.url);
        await sleep(100);
        await asyncTimeout(docOnPeer2.whenReady(), 1000);
        expect(docOnPeer2.doc()!.offlineText).to.be.undefined;
      }

      {
        // Wait for offline changes to be synced after reconnect.
        const docOnPeer2 = await peer2.repo.find<any>(handle.url);
        await docChangeAfterAction(docOnPeer2, () => connectPeers(spaceKey, teleportBuilder, peer1, peer2));
        await docOnPeer2.whenReady();
        expect(docOnPeer2.doc()!.offlineText).to.eq(offlineText);

        // Test connection.
        const onlineText = 'This has been written after the connection was re-established';
        await docChangeAfterAction(docOnPeer2, async () => {
          handle.change((doc: any) => {
            doc.onlineText = onlineText;
          });
        });
        await docOnPeer2.whenReady();
        expect(docOnPeer2.doc()!.onlineText).to.eq(onlineText);
      }
    });

    test('pulls a document if it is in a remote collection', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peerWithDocs = await createTeleportPeerWithStoredDocs(teleportBuilder, spaceKey, async (repo) => {
        return range(2, (idx) => {
          const document = repo.create();
          document.change((doc: any) => (doc.text = 'hello ' + idx));
          return document;
        });
      });
      const [docInRemoteCollection, docNotInRemoteCollection] = peerWithDocs.documents;

      // Create a peer that shares one of the collections.
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        localDocuments: [],
        remoteCollections: { [peerWithDocs.peerId]: [docInRemoteCollection.documentId] },
      });
      await connectPeers(spaceKey, teleportBuilder, peerWithDocs.peer, peer2);

      const shouldNotFindDoc = await peer2.repo.find(docNotInRemoteCollection.url, FIND_PARAMS);
      const shouldFindDoc = await peer2.repo.find(docInRemoteCollection.url, FIND_PARAMS);
      await shouldFindDoc.whenReady();
      expect(shouldFindDoc.doc()).to.deep.eq(docInRemoteCollection.doc());
      await asyncTimeout(shouldNotFindDoc.whenReady(['unavailable']), 1000);
    });

    /**
     * This can happen if there's no local document and sharePolicy returns true to every connected
     * peer to try getting a document from it. Remote collection check has to be performed.
     */
    test('document is not shared with peer who did not request it', async () => {
      const [spaceKey, anotherSpaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peerWithDocs = await createTeleportPeerWithStoredDocs(teleportBuilder, spaceKey, async (repo) => {
        const document = repo.create();
        document.change((doc: any) => (doc.text = 'hello'));
        return [document];
      });
      const [document] = peerWithDocs.documents;

      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        localDocuments: [],
        remoteCollections: { [peerWithDocs.peerId]: [document.documentId] },
      });
      const peerFromAnotherSpace = await createTeleportTestPeer(teleportBuilder, anotherSpaceKey, {
        localDocuments: [],
      });
      await connectPeers(spaceKey, teleportBuilder, peerWithDocs.peer, peer2);
      await connectPeers(anotherSpaceKey, teleportBuilder, peer2, peerFromAnotherSpace);

      const loadedDocument = await peer2.repo.find(document.url, FIND_PARAMS);
      await asyncTimeout(loadedDocument.whenReady(), 1000);

      await sleep(200);
      const doc = await peerFromAnotherSpace.repo.find(document.url, { allowableStates: ['unavailable'] });
      await asyncTimeout(doc.whenReady(['unavailable']), 1000);
    });

    test('collection-sync with chain of peers', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peerWithDocs = await createTeleportPeerWithStoredDocs(teleportBuilder, spaceKey, async (repo) => {
        const document = repo.create();
        document.change((doc: any) => (doc.text = 'hello'));
        return [document];
      });
      const [document] = peerWithDocs.documents;

      const peer2Id = 'peer2';
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        peerId: peer2Id,
        localDocuments: [],
        remoteCollections: { [peerWithDocs.peerId]: [document.documentId] },
      });
      const peer3 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        localDocuments: [],
        remoteCollections: { [peer2Id]: [document.documentId] },
      });
      await connectPeers(spaceKey, teleportBuilder, peerWithDocs.peer, peer2);
      await connectPeers(spaceKey, teleportBuilder, peer2, peer3);

      const loadedDocument = await peer2.repo.find(document.url, FIND_PARAMS);
      await loadedDocument.whenReady();

      const doc = await peer3.repo.find(document.url, FIND_PARAMS);
      await doc.whenReady();
      expect(doc.doc()).to.deep.eq(document.doc());
    });

    test('document is passively replicated to connected peers', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peer1 = await createTeleportTestPeer(teleportBuilder, spaceKey);
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey);

      const handle = peer1.repo.create();
      handle.change((doc: any) => (doc.text = 'hello'));
      await connectPeers(spaceKey, teleportBuilder, peer1, peer2);

      await expect
        .poll(async () => {
          const doc = peer2.repo.handles[handle.documentId];
          await doc.whenReady();
          return doc.doc()!.text;
        })
        .toEqual('hello');
    });

    test('imported document is passively replicated to connected peers', async () => {
      let blob: Uint8Array;
      let documentId: DocumentId;
      {
        const repo = new Repo();
        const handle = repo.create();
        handle.change((doc: any) => (doc.text = 'hello'));
        blob = A.save(handle.doc()!);
        documentId = handle.documentId;
      }

      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      onTestFinished(() => teleportBuilder.destroy());

      const peer1 = await createTeleportTestPeer(teleportBuilder, spaceKey);
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey);
      await connectPeers(spaceKey, teleportBuilder, peer1, peer2);

      const handle = peer1.repo.import(blob, { docId: documentId });
      await handle.whenReady();

      await expect
        .poll(
          async () => {
            const doc = peer2.repo.handles[handle.documentId];
            await doc.whenReady();
            return doc.doc()!.text;
          },
          { timeout: 1_000 },
        )
        .toEqual('hello');
    });
  });

  const createLevelAdapter = async (level = createTestLevel()) => {
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);
    return storage;
  };

  const createTeleportPeerWithStoredDocs = async (
    teleportBuilder: TeleportBuilder,
    spaceKey: PublicKey,
    createDocCallback: (repo: Repo) => Promise<A.Doc<any>[]>,
  ) => {
    const peerId = 'A';
    const storage = await createLevelAdapter();
    const peer = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage, peerId });
    const documents = await createDocCallback(peer.repo);
    await peer.repo.flush();
    // Reload the first peer so that documents are NOT pushed to the new connection.
    const reloadedPeer = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage, peerId });
    return { peer: reloadedPeer, peerId, documents };
  };
});

type ShareConfig = Exclude<ConstructorParameters<typeof Repo>[0], undefined>['shareConfig'];

type ConnectedRepoOptions = {
  storages?: StorageAdapterInterface[];
  connectionStateProvider?: TestConnectionStateProvider;
  sharePolicy?: SharePolicy;
  shareConfig?: ShareConfig;
};

const createRepoTopology = async <Peers extends string[], Peer extends string = Peers[number]>(args: {
  peers: Peers;
  connections: [Peer, Peer][];
  options?: ConnectedRepoOptions;
  onMessage?: (message: Message) => void;
}) => {
  const adapters = args.connections.map(
    () => TestAdapter.createPair(args.options?.connectionStateProvider, args.onMessage) as [TestAdapter, TestAdapter],
  );
  const repos = args.peers.map((peerId, peerIndex) => {
    const network = adapters
      .map((pair, idx) => {
        return args.connections[idx].includes(peerId as Peer)
          ? peerId === args.connections[idx][0]
            ? pair[0]
            : pair[1]
          : null;
      })
      .filter(isNonNullable);
    return new Repo({
      peerId: peerId as PeerId,
      storage: args.options?.storages?.[peerIndex],
      network,
      sharePolicy: (args.options?.sharePolicy ?? args.options?.shareConfig) ? undefined : async () => true,
      shareConfig: args.options?.shareConfig,
    });
  });
  return { repos, adapters };
};

const connectAdapters = async (pairs: [TestAdapter, TestAdapter][], options?: { noEmitPeerCandidate?: boolean }) => {
  for (const pair of pairs) {
    await pair[0].onConnect.wait();
    await pair[1].onConnect.wait();
    if (!options?.noEmitPeerCandidate) {
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }
  }
};

const createHostClientRepoTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({ peers: HOST_AND_CLIENT, connections: [HOST_AND_CLIENT], options });

const reconnectAdapters = async (pairs: [TestAdapter, TestAdapter][]) => {
  for (const pair of pairs) {
    // Note: Retry hack.
    pair[0].peerDisconnected(pair[1].peerId!);
    pair[1].peerDisconnected(pair[0].peerId!);
    pair[0].peerCandidate(pair[1].peerId!);
    pair[1].peerCandidate(pair[0].peerId!);
  }
};

const docChangeAfterAction = async (handle: DocHandle<any>, action: () => Promise<void>) => {
  const receivedUpdate = new Promise((resolve) => handle.once('heads-changed', resolve));
  await action();
  return receivedUpdate;
};

const createTeleportTestPeer = async (
  teleportBuilder: TeleportBuilder,
  spaceKey: PublicKey,
  options?: {
    peerId?: string;
    storage?: StorageAdapterInterface;
    localDocuments?: string[];
    remoteCollections?: { [peerId: string]: string[] };
  },
): Promise<TeleportTestPeer> => {
  const meshAdapter = new MeshEchoReplicator();
  const echoAdapter = new EchoNetworkAdapter({
    // If a document is in the remote collection we don't have it locally, so can't get spaceKey from it.
    getContainingSpaceForDocument: async (documentId) => {
      return options?.localDocuments ? (options.localDocuments.includes(documentId) ? spaceKey : null) : spaceKey;
    },
    isDocumentInRemoteCollection: async (params) => {
      return options?.remoteCollections?.[params.peerId]?.includes(params.documentId) ?? false;
    },
    onCollectionStateQueried: () => {},
    onCollectionStateReceived: () => {},
  });
  const repo = new Repo({
    peerId: options?.peerId as PeerId,
    network: [echoAdapter],
    storage: options?.storage,
    sharePolicy: async (peerId, documentId) =>
      documentId ? echoAdapter.shouldAdvertise(peerId, { documentId }) : false,
  });
  await echoAdapter.open();
  await echoAdapter.whenConnected();
  await echoAdapter.addReplicator(meshAdapter);
  const [teleport] = teleportBuilder.createPeers({ factory: () => new TeleportPeer() });
  return { repo, meshAdapter, teleport };
};

const connectPeers = async (
  spaceKey: PublicKey,
  builder: TeleportBuilder,
  peer1: TeleportTestPeer,
  peer2: TeleportTestPeer,
) => {
  const [connection1, connection2] = await builder.connect(peer1.teleport, peer2.teleport);
  await peer1.meshAdapter.authorizeDevice(spaceKey, peer2.teleport.peerId);
  connection1.teleport.addExtension('automerge', peer1.meshAdapter.createExtension());
  await peer2.meshAdapter.authorizeDevice(spaceKey, peer1.teleport.peerId);
  connection2.teleport.addExtension('automerge', peer2.meshAdapter.createExtension());
};

type TeleportTestPeer = { repo: Repo; meshAdapter: MeshEchoReplicator; teleport: TeleportPeer };

export const createTmpPath = (): string => {
  return `/tmp/dxos-${PublicKey.random().toHex()}`;
};
