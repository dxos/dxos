//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { asyncTimeout, sleep } from '@dxos/async';
import { type Heads, change, clone, equals, from, getBackend, getHeads } from '@dxos/automerge/automerge';
import { type Message, Repo, type PeerId, type DocumentId, type HandleState } from '@dxos/automerge/automerge-repo';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { afterTest, describe, openAndClose, test } from '@dxos/test';
import { arrayToBuffer, bufferToArray } from '@dxos/util';

import { EchoNetworkAdapter } from './echo-network-adapter';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';
import { MeshEchoReplicator } from './mesh-echo-replicator';
import { TestAdapter } from '../testing';

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
    const level = createTestLevel();
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);

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
    const level = createTestLevel();
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);

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

  test('basic networking', async () => {
    const hostAdapter: TestAdapter = new TestAdapter({
      send: (message: Message) => clientAdapter.receive(message),
    });
    const clientAdapter: TestAdapter = new TestAdapter({
      send: (message: Message) => hostAdapter.receive(message),
    });

    const host = new Repo({
      network: [hostAdapter],
    });
    const client = new Repo({
      network: [clientAdapter],
    });
    hostAdapter.ready();
    clientAdapter.ready();
    await hostAdapter.onConnect.wait();
    await clientAdapter.onConnect.wait();
    hostAdapter.peerCandidate(clientAdapter.peerId!);
    clientAdapter.peerCandidate(hostAdapter.peerId!);

    const handle = host.create();
    const text = 'Hello world';
    handle.change((doc: any) => {
      doc.text = text;
    });

    const docOnClient = client.find(handle.url);
    expect((await asyncTimeout(docOnClient.doc(), 1000)).text).to.equal(text);
  });

  test('share policy gets enabled afterwards', async () => {
    const [hostAdapter, clientAdapter] = TestAdapter.createPair();
    let sharePolicy = false;

    const host = new Repo({
      network: [hostAdapter],
      peerId: 'host' as PeerId,
      sharePolicy: async () => sharePolicy,
    });
    const client = new Repo({
      network: [clientAdapter],
      peerId: 'client' as PeerId,
      sharePolicy: async () => sharePolicy,
    });
    hostAdapter.ready();
    clientAdapter.ready();
    await hostAdapter.onConnect.wait();
    await clientAdapter.onConnect.wait();
    hostAdapter.peerCandidate(clientAdapter.peerId!);
    clientAdapter.peerCandidate(hostAdapter.peerId!);

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
    const [hostAdapter, clientAdapter] = TestAdapter.createPair();
    const allowedDocs: DocumentId[] = [];

    const host: Repo = new Repo({
      network: [hostAdapter],
      peerId: 'host' as PeerId,
      sharePolicy: async (_, docId) => (docId ? allowedDocs.includes(docId) && !!host.handles[docId] : false),
    });

    const client: Repo = new Repo({
      network: [clientAdapter],
      peerId: 'client' as PeerId,
      sharePolicy: async (_, docId) => (docId ? allowedDocs.includes(docId) && !!client.handles[docId] : false),
    });

    const firstHandle = host.create();
    firstHandle.change((doc: any) => (doc.text = 'Hello world'));
    await host.find(firstHandle.url).whenReady();
    allowedDocs.push(firstHandle.documentId);

    {
      // Initiate connection.
      hostAdapter.ready();
      clientAdapter.ready();
      await hostAdapter.onConnect.wait();
      await clientAdapter.onConnect.wait();
      hostAdapter.peerCandidate(clientAdapter.peerId!);
      clientAdapter.peerCandidate(hostAdapter.peerId!);
    }

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

    const hostAdapter: TestAdapter = new TestAdapter({
      send: (message: Message) => connectionState === 'on' && sleep(10).then(() => clientAdapter.receive(message)),
    });
    const clientAdapter: TestAdapter = new TestAdapter({
      send: (message: Message) => connectionState === 'on' && sleep(10).then(() => hostAdapter.receive(message)),
    });

    const host = new Repo({
      network: [hostAdapter],
    });
    const client = new Repo({
      network: [clientAdapter],
    });

    // Establish connection.
    hostAdapter.ready();
    clientAdapter.ready();
    await hostAdapter.onConnect.wait();
    await clientAdapter.onConnect.wait();
    hostAdapter.peerCandidate(clientAdapter.peerId!);
    clientAdapter.peerCandidate(hostAdapter.peerId!);

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
      hostAdapter.peerDisconnected(clientAdapter.peerId!);
      clientAdapter.peerDisconnected(hostAdapter.peerId!);
      hostAdapter.peerCandidate(clientAdapter.peerId!);
      clientAdapter.peerCandidate(hostAdapter.peerId!);

      handle.change((doc: any) => {
        doc.onlineText = onlineText;
      });
      await sleep(100);
      expect((await asyncTimeout(docOnClient.doc(), 1000)).onlineText).to.equal(onlineText);
      expect((await asyncTimeout(docOnClient.doc(), 1000)).offlineText).to.equal(offlineText);
    }
  });

  test('integration test with teleport', async () => {
    const [spaceKey] = PublicKey.randomSequence();

    const createAutomergeRepo = async () => {
      const meshAdapter = new MeshEchoReplicator();
      const echoAdapter = new EchoNetworkAdapter({
        getContainingSpaceForDocument: async () => spaceKey,
      });
      const repo = new Repo({
        network: [echoAdapter],
      });
      await echoAdapter.open();
      await echoAdapter.whenConnected();
      await echoAdapter.addReplicator(meshAdapter);
      return { repo, meshAdapter };
    };
    const peer1 = await createAutomergeRepo();
    const peer2 = await createAutomergeRepo();

    const handle = peer1.repo.create();

    const teleportBuilder = new TeleportBuilder();
    afterTest(() => teleportBuilder.destroy());

    const [teleportPeer1, teleportPeer2] = teleportBuilder.createPeers({ factory: () => new TeleportPeer() });
    {
      // Initiate connection.
      const [connection1, connection2] = await teleportBuilder.connect(teleportPeer1, teleportPeer2);
      connection1.teleport.addExtension('automerge', peer1.meshAdapter.createExtension());
      connection2.teleport.addExtension('automerge', peer2.meshAdapter.createExtension());

      // Test connection.
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
      // Disconnect peers.
      await teleportBuilder.disconnect(teleportPeer1, teleportPeer2);

      // Make offline changes.
      const offlineText = 'This has been written while the connection was off';
      handle.change((doc: any) => {
        doc.offlineText = offlineText;
      });
      const docOnPeer2 = peer2.repo.find(handle.url);
      await sleep(100);
      expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).to.be.undefined;
    }

    {
      const docOnPeer2 = peer2.repo.find(handle.url);
      const receivedUpdate = new Promise((resolve, reject) => docOnPeer2.once('heads-changed', resolve));

      // Reconnect peers.
      const [connection1, connection2] = await teleportBuilder.connect(teleportPeer1, teleportPeer2);
      connection1.teleport.addExtension('automerge', peer1.meshAdapter.createExtension());
      connection2.teleport.addExtension('automerge', peer2.meshAdapter.createExtension());

      // Wait for offline changes to be synced.
      await receivedUpdate;
      await docOnPeer2.whenReady();
      expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).to.eq(offlineText);

      // Test connection.
      const onlineText = 'This has been written after the connection was re-established';
      const receivedOnlineUpdate = new Promise((resolve, reject) => docOnPeer2.once('heads-changed', resolve));
      handle.change((doc: any) => {
        doc.onlineText = onlineText;
      });
      await receivedOnlineUpdate;
      await docOnPeer2.whenReady();
      expect((await asyncTimeout(docOnPeer2.doc(), 1000)).onlineText).to.eq(onlineText);
    }
  });

  describe('storage', () => {
    test('loadRange', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const level = createTestLevel(root);
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await level.open();
        await adapter.open();

        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
        await adapter.close();
        await level.close();
      }

      {
        const level = createTestLevel(root);
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await openAndClose(level, adapter);

        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.eq(['one', 'two']);
        expect(range.map((chunk) => chunk.key)).to.eq([
          ['test', '1'],
          ['test', '2'],
        ]);
      }
    });

    test('removeRange', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const level = createTestLevel(root);
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await level.open();
        await adapter.open();
        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
        await adapter.close();
        await level.close();
      }

      {
        const level = createTestLevel(root);
        const adapter = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
        await openAndClose(level, adapter);
        await adapter.removeRange(['test']);
        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.eq([]);
        const range2 = await adapter.loadRange(['bar']);
        expect(range2.map((chunk) => arrayToBuffer(chunk.data!).toString())).to.eq(['bar']);
        expect(range2.map((chunk) => chunk.key)).to.eq([['bar', '1']]);
      }
    });
  });

  test('replication though a 4 peer chain', async () => {
    const pairAB = TestAdapter.createPair();
    const pairBC = TestAdapter.createPair();
    const pairCD = TestAdapter.createPair();

    const repoA = new Repo({
      peerId: 'A' as any,
      network: [pairAB[0]],
      sharePolicy: async () => true,
    });
    const _repoB = new Repo({
      peerId: 'B' as any,
      network: [pairAB[1], pairBC[0]],
      sharePolicy: async () => true,
    });
    const _repoC = new Repo({
      peerId: 'C' as any,
      network: [pairBC[1], pairCD[0]],
      sharePolicy: async () => true,
    });
    const repoD = new Repo({
      peerId: 'D' as any,
      network: [pairCD[1]],
      sharePolicy: async () => true,
    });

    for (const pair of [pairAB, pairBC, pairCD]) {
      pair[0].ready();
      pair[1].ready();
      await pair[0].onConnect.wait();
      await pair[1].onConnect.wait();
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }

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
    const pairAB = TestAdapter.createPair();
    const pairBC = TestAdapter.createPair();

    const repoA = new Repo({
      peerId: 'A' as any,
      network: [pairAB[0]],
      sharePolicy: async () => true,
    });
    const repoB = new Repo({
      peerId: 'B' as any,
      network: [pairAB[1], pairBC[0]],
      sharePolicy: async () => true,
    });
    const repoC = new Repo({
      peerId: 'C' as any,
      network: [pairBC[1]],
      sharePolicy: async () => true,
    });

    for (const pair of [pairAB, pairBC]) {
      pair[0].ready();
      pair[1].ready();
      await pair[0].onConnect.wait();
      await pair[1].onConnect.wait();
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }

    const docA = repoA.create();
    // NOTE: Doesn't work if the doc is empty.
    docA.change((doc: any) => {
      doc.text = 'Hello world';
    });

    const _docB = repoB.find(docA.url);
    const docC = repoC.find(docA.url);

    await docC.whenReady();
  });

  test('replicate document after request', async () => {
    const [adapter1, adapter2] = TestAdapter.createPair();
    const repoA = new Repo({
      peerId: 'A' as any,
      network: [adapter1],
      sharePolicy: async () => true,
    });
    const repoB = new Repo({
      peerId: 'B' as any,
      network: [adapter2],
      sharePolicy: async () => true,
    });

    const unavailable: HandleState = 'unavailable';

    {
      // Connect repos.
      adapter1.ready();
      adapter2.ready();
      await adapter1.onConnect.wait();
      await adapter2.onConnect.wait();
    }

    const docA = repoA.create();
    // NOTE: Doesn't work if the doc is empty.
    docA.change((doc: any) => {
      doc.text = 'Hello world';
    });

    const docB = repoB.find(docA.url);
    {
      // Request document from repoB.
      await asyncTimeout(docB.whenReady([unavailable]), 1_000);
    }

    {
      // Failing to find a document.
      // await (docB.whenReady([unavailable]), 1_000);
    }

    {
      adapter1.peerCandidate(adapter2.peerId!);
      await sleep(100);
      adapter2.peerCandidate(adapter1.peerId!);
    }

    {
      await asyncTimeout(docB.whenReady([unavailable]), 1_000);
    }

    {
      // Note: Retry hack.
      adapter1.peerDisconnected(adapter2.peerId!);
      adapter2.peerDisconnected(adapter1.peerId!);
      adapter1.peerCandidate(adapter2.peerId!);
      adapter2.peerCandidate(adapter1.peerId!);

      await asyncTimeout(docB.whenReady(), 1_000);
    }
  });
});
