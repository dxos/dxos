//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { asyncTimeout, sleep } from '@dxos/async';
import {
  change,
  clone,
  equals,
  from,
  getBackend,
  getHeads,
  type Heads,
  next as A,
  save,
  saveSince,
} from '@dxos/automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  generateAutomergeUrl,
  type HandleState,
  parseAutomergeUrl,
  type StorageAdapterInterface,
  type PeerId,
  Repo,
  type SharePolicy,
} from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';
import { nonNullable } from '@dxos/util';

import { EchoNetworkAdapter } from './echo-network-adapter';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { MeshEchoReplicator } from './mesh-echo-replicator';
import { TestAdapter, type TestConnectionStateProvider } from '../testing';

const HOST_AND_CLIENT: [string, string] = ['host', 'client'];

describe('AutomergeRepo', () => {
  test('change events', () => {
    const repo = new Repo({ network: [] });
    const handle = repo.create<{ field?: string }>();

    let valueDuringChange: string | undefined;

    handle.addListener('change', (doc) => {
      valueDuringChange = handle.docSync().field;
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
    const handle = host.find(url as AutomergeUrl);
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
      const handle = repo.find(url as AutomergeUrl);

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

      const docOnClient = client.find(handle.url);
      expect((await asyncTimeout(docOnClient.doc(), 1000)).text).to.equal(text);
    });

    test('share policy gets enabled afterwards', async () => {
      let sharePolicy = false;

      const { repos, adapters } = await createHostClientRepoTopology({
        sharePolicy: async () => sharePolicy,
      });
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create();
      const text = 'Hello world';
      handle.change((doc: any) => {
        doc.text = text;
      });

      {
        const docOnClient = client.find(handle.url);
        await asyncTimeout(docOnClient.whenReady(['unavailable']), 1000);
      }

      sharePolicy = true;

      {
        const docOnClient = client.find(handle.url);
        // TODO(mykola): We expect the document to be available here, but it's not.
        await asyncTimeout(docOnClient.whenReady(['unavailable']), 1000);
      }
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
      await host.find(firstHandle.url).whenReady();
      allowedDocs.push(firstHandle.documentId);

      await connectAdapters(adapters);

      {
        const firstDocOnClient = client.find(firstHandle.url);
        await asyncTimeout(firstDocOnClient.whenReady(), 1000);
        expect(firstDocOnClient.docSync().text).to.equal('Hello world');
      }

      const secondHandle = host.create();
      secondHandle.change((doc: any) => (doc.text = 'Hello world'));
      await host.find(secondHandle.url).whenReady();
      allowedDocs.push(secondHandle.documentId);

      {
        const secondDocOnClient = client.find(secondHandle.url);
        await asyncTimeout(secondDocOnClient.whenReady(), 1000);
        expect(secondDocOnClient.docSync().text).to.equal('Hello world');
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
      const docOnClient = client.find(handle.url);
      {
        const sanityText = 'Hello world';
        handle.change((doc: any) => {
          doc.sanityText = sanityText;
        });

        expect((await asyncTimeout(docOnClient.doc(), 1000)).sanityText).to.equal(sanityText);
      }

      // Disrupt connection.
      const offlineText = 'This has been written while the connection was off';
      {
        connectionState = 'off';

        handle.change((doc: any) => {
          doc.offlineText = offlineText;
        });

        await sleep(100);
        expect((await asyncTimeout(docOnClient.doc(), 1000)).offlineText).to.be.undefined;
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
        expect((await asyncTimeout(docOnClient.doc(), 1000)).onlineText).to.equal(onlineText);
        expect((await asyncTimeout(docOnClient.doc(), 1000)).offlineText).to.equal(offlineText);
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

      const docD = repoD.find(docA.url);

      await docD.whenReady();
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

      const _ = repoB.find(docA.url);
      const docC = repoC.find(docA.url);
      await docC.whenReady();
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

      const docB = client.find(docA.url);

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
      const hostHandle = peer1.find(url as AutomergeUrl);

      // Doc should be pushed to peer2
      await waitForExpect(() => {
        expect(hostHandle.docSync().text).not.to.be.undefined;
        expect(peer2.handles[hostHandle.documentId].docSync()).to.deep.eq(hostHandle.docSync());
      });
    });

    test('client cold-starts and syncs doc from a Repo', async () => {
      const repo = new Repo({ network: [] });
      const serverHandle = repo.create<{ field?: string }>();

      let clientDoc = A.from<{ field?: string }>({});
      const receiveByClient = (blob: Uint8Array) => {
        clientDoc = A.loadIncremental(clientDoc, blob);
      };

      // Sync handshake.
      let syncedHeads = getHeads(serverHandle.docSync());
      receiveByClient(save(serverHandle.docSync()));

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
      const receiveByServer = async (blob: Uint8Array, docId: DocumentId) => {
        const serverHandle = repo.find(docId);
        serverHandle.update((doc) => {
          return A.loadIncremental(doc, blob);
        });
      };

      let clientDoc = A.from<{ field?: string }>({});
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      // Sync handshake.
      let sentHeads = getHeads(clientDoc);

      // Sync protocol.
      const sendDoc = async (doc: A.Doc<any>) => {
        await receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      {
        // Change doc and send changes to server.
        const value = 'text to test if sync works';
        clientDoc = A.change(clientDoc, (doc: any) => {
          doc.field = value;
        });
        await sendDoc(clientDoc);

        await repo.find(documentId).whenReady();
        expect(repo.find(documentId).docSync().field).to.deep.equal(value);
      }
    });

    test('two repo sync docs on `update` call', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [repoA, repoB] = repos;
      await connectAdapters(adapters);

      const handleA = repoA.create();
      const handleB = repoB.find(handleA.url);

      const text = 'Hello world';
      handleA.update((doc: any) => {
        return A.change(doc, (doc: any) => {
          doc.text = text;
        });
      });

      expect(handleA.docSync().text).to.equal(text);

      await asyncTimeout(handleB.whenReady(), 1000);
      expect(handleB.docSync().text).to.equal(text);
    });
  });

  describe('teleport', () => {
    test('integration test with teleport', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      afterTest(() => teleportBuilder.destroy());

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
        await waitForExpect(async () => {
          const docOnPeer2 = peer2.repo.find(handle.url);
          const doc = await asyncTimeout(docOnPeer2.doc(), 1000);
          expect(doc.text).to.eq(text);
        }, 1000);
      }

      const offlineText = 'This has been written while the connection was off';
      {
        // Disconnect peers and make offline changes.
        await teleportBuilder.disconnect(peer1.teleport, peer2.teleport);
        const offlineText = 'This has been written while the connection was off';
        handle.change((doc: any) => {
          doc.offlineText = offlineText;
        });
        const docOnPeer2 = peer2.repo.find(handle.url);
        await sleep(100);
        expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).to.be.undefined;
      }

      {
        // Wait for offline changes to be synced after reconnect.
        const docOnPeer2 = peer2.repo.find(handle.url);
        await docChangeAfterAction(docOnPeer2, () => connectPeers(spaceKey, teleportBuilder, peer1, peer2));
        await docOnPeer2.whenReady();
        expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).to.eq(offlineText);

        // Test connection.
        const onlineText = 'This has been written after the connection was re-established';
        await docChangeAfterAction(docOnPeer2, async () => {
          handle.change((doc: any) => {
            doc.onlineText = onlineText;
          });
        });
        await docOnPeer2.whenReady();
        expect((await asyncTimeout(docOnPeer2.doc(), 1000)).onlineText).to.eq(onlineText);
      }
    });

    test('pulls a document if it is in a remote collection', async () => {
      const [spaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      afterTest(() => teleportBuilder.destroy());

      const storage = await createLevelAdapter();

      // Create document in different collections.
      const peer1 = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage });
      const docInRemoteCollection = peer1.repo.create();
      docInRemoteCollection.change((doc: any) => (doc.text = 'hello'));
      const docNotInRemoteCollection = peer1.repo.create();
      docNotInRemoteCollection.change((doc: any) => (doc.text = 'world'));
      await peer1.repo.flush();

      const peerId = 'A';
      // Reload the first peer so that documents are NOT pushed to the new connection.
      const reloadedPeer1 = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage, peerId });
      // Create a peer that shares one of the collections.
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        localDocuments: [],
        remoteCollections: { [peerId]: [docInRemoteCollection.documentId] },
      });
      await connectPeers(spaceKey, teleportBuilder, reloadedPeer1, peer2);

      const shouldNotFindDoc = peer2.repo.find(docNotInRemoteCollection.url);
      const shouldFindDoc = peer2.repo.find(docInRemoteCollection.url);
      await shouldFindDoc.whenReady();
      expect(shouldFindDoc.docSync()).to.deep.eq(docInRemoteCollection.docSync());
      await shouldNotFindDoc.whenReady(['unavailable']);
    });

    /**
     * This can happen if there's no local document and sharePolicy returns true to every connected
     * peer to try getting a document from it. Remote collection check has to be performed.
     */
    test('document is not shared with peer who did not request it', async () => {
      const [spaceKey, anotherSpaceKey] = PublicKey.randomSequence();

      const teleportBuilder = new TeleportBuilder();
      afterTest(() => teleportBuilder.destroy());

      const storage = await createLevelAdapter();

      // Create document in different collections.
      const peer1 = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage });
      const document = peer1.repo.create();
      document.change((doc: any) => (doc.text = 'hello'));
      await peer1.repo.flush();

      const peerId = 'A';
      // Reload the first peer so that documents are NOT pushed to the new connection.
      const reloadedPeer1 = await createTeleportTestPeer(teleportBuilder, spaceKey, { storage, peerId });
      const peer2 = await createTeleportTestPeer(teleportBuilder, spaceKey, {
        localDocuments: [],
        remoteCollections: { [peerId]: [document.documentId] },
      });
      const peerFromAnotherSpace = await createTeleportTestPeer(teleportBuilder, anotherSpaceKey, {
        localDocuments: [],
      });
      await connectPeers(spaceKey, teleportBuilder, reloadedPeer1, peer2);
      await connectPeers(anotherSpaceKey, teleportBuilder, peer2, peerFromAnotherSpace);

      const loadedDocument = peer2.repo.find(document.url);
      await loadedDocument.whenReady();

      await sleep(200);
      const doc = peerFromAnotherSpace.repo.find(document.url);
      await doc.whenReady(['unavailable']);
    });
  });

  const createLevelAdapter = async () => {
    const level = createTestLevel();
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);
    return storage;
  };
});

type ConnectedRepoOptions = {
  storages?: StorageAdapterInterface[];
  connectionStateProvider?: TestConnectionStateProvider;
  sharePolicy?: SharePolicy;
};

const createRepoTopology = async <Peers extends string[], Peer extends string = Peers[number]>(args: {
  peers: Peers;
  connections: [Peer, Peer][];
  options?: ConnectedRepoOptions;
}) => {
  const adapters = args.connections.map(
    () => TestAdapter.createPair(args.options?.connectionStateProvider) as [TestAdapter, TestAdapter],
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
      .filter(nonNullable);
    return new Repo({
      peerId: peerId as PeerId,
      storage: args.options?.storages?.[peerIndex],
      network,
      sharePolicy: args.options?.sharePolicy ?? (async () => true),
    });
  });
  return { repos, adapters };
};

const connectAdapters = async (pairs: [TestAdapter, TestAdapter][], options?: { noEmitPeerCandidate?: boolean }) => {
  for (const pair of pairs) {
    pair[0].ready();
    pair[1].ready();
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
