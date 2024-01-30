//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'crypto';
import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { type Message, NetworkAdapter, type PeerId, Repo } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { TestBuilder as TeleportBuilder, TestPeer as TeleportPeer } from '@dxos/teleport/testing';
import { afterTest, describe, test } from '@dxos/test';
import { arrayToBuffer, bufferToArray } from '@dxos/util';

import { AutomergeHost, AutomergeStorageAdapter, MeshNetworkAdapter } from './automerge-host';

describe('AutomergeHost', () => {
  test('can create documents', () => {
    const host = new AutomergeHost(createStorage({ type: StorageType.RAM }).createDirectory());

    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    expect(handle.docSync().text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const storageDirectory = createStorage({ type: StorageType.RAM }).createDirectory();

    const host = new AutomergeHost(storageDirectory);
    const handle = host.repo.create();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    // TODO(dmaretskyi): Is there a way to know when automerge has finished saving?
    await sleep(100);

    const host2 = new AutomergeHost(storageDirectory);
    const handle2 = host2.repo.find(url);
    await handle2.whenReady();
    expect(handle2.docSync().text).toEqual('Hello world');
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
    expect((await asyncTimeout(docOnClient.doc(), 1000)).text).toEqual(text);
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

      expect((await asyncTimeout(docOnClient.doc(), 1000)).sanityText).toEqual(sanityText);
    }

    // Disrupt connection.
    const offlineText = 'This has been written while the connection was off';
    {
      connectionState = 'off';

      handle.change((doc: any) => {
        doc.offlineText = offlineText;
      });

      await sleep(100);
      expect((await asyncTimeout(docOnClient.doc(), 1000)).offlineText).toBeUndefined();
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
      expect((await asyncTimeout(docOnClient.doc(), 1000)).onlineText).toEqual(onlineText);
      expect((await asyncTimeout(docOnClient.doc(), 1000)).offlineText).toEqual(offlineText);
    }
  });

  test('integration test with teleport', async () => {
    const createAutomergeRepo = () => {
      const meshAdapter = new MeshNetworkAdapter();
      const repo = new Repo({
        network: [meshAdapter],
      });
      meshAdapter.ready();
      return { repo, meshAdapter };
    };
    const peer1 = createAutomergeRepo();
    const peer2 = createAutomergeRepo();
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
      const docOnPeer2 = peer2.repo.find(handle.url);
      await waitForExpect(async () => expect((await asyncTimeout(docOnPeer2.doc(), 1000)).text).toEqual(text), 1000);
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
      expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).toBeUndefined();
    }

    {
      // Reconnect peers.
      const [connection1, connection2] = await teleportBuilder.connect(teleportPeer1, teleportPeer2);
      connection1.teleport.addExtension('automerge', peer1.meshAdapter.createExtension());
      connection2.teleport.addExtension('automerge', peer2.meshAdapter.createExtension());

      // Wait for offline changes to be synced.
      const docOnPeer2 = peer2.repo.find(handle.url);
      await waitForExpect(
        async () => expect((await asyncTimeout(docOnPeer2.doc(), 1000)).offlineText).toEqual(offlineText),
        1000,
      );

      // Test connection.
      const onlineText = 'This has been written after the connection was re-established';
      handle.change((doc: any) => {
        doc.onlineText = onlineText;
      });
      await waitForExpect(
        async () => expect((await asyncTimeout(docOnPeer2.doc(), 1000)).onlineText).toEqual(onlineText),
        1000,
      );
    }
  });

  describe('storage', () => {
    test('load range on node', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const storage = createStorage({ type: StorageType.NODE, root });
        const adapter = new AutomergeStorageAdapter(storage.createDirectory());

        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
      }

      {
        const storage = createStorage({ type: StorageType.NODE, root });
        const adapter = new AutomergeStorageAdapter(storage.createDirectory());

        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).toEqual(['one', 'two']);
        expect(range.map((chunk) => chunk.key)).toEqual([
          ['test', '1'],
          ['test', '2'],
        ]);
      }
    });

    test('removeRange on node', async () => {
      const root = `/tmp/${randomBytes(16).toString('hex')}`;
      {
        const storage = createStorage({ type: StorageType.NODE, root });
        const adapter = new AutomergeStorageAdapter(storage.createDirectory());
        await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
        await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
        await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
      }

      {
        const storage = createStorage({ type: StorageType.NODE, root });
        const adapter = new AutomergeStorageAdapter(storage.createDirectory());
        await adapter.removeRange(['test']);
        const range = await adapter.loadRange(['test']);
        expect(range.map((chunk) => arrayToBuffer(chunk.data!).toString())).toEqual([]);
        const range2 = await adapter.loadRange(['bar']);
        expect(range2.map((chunk) => arrayToBuffer(chunk.data!).toString())).toEqual(['bar']);
        expect(range2.map((chunk) => chunk.key)).toEqual([['bar', '1']]);
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
});

class TestAdapter extends NetworkAdapter {
  static createPair() {
    const adapter1: TestAdapter = new TestAdapter({
      send: (message: Message) => sleep(10).then(() => adapter2.receive(message)),
    });
    const adapter2: TestAdapter = new TestAdapter({
      send: (message: Message) => sleep(10).then(() => adapter1.receive(message)),
    });

    return [adapter1, adapter2];
  }

  public onConnect = new Trigger();

  constructor(private readonly _params: { send: (message: Message) => void }) {
    super();
  }

  // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
  //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
  ready() {
    this.emit('ready', { network: this });
  }

  override connect(peerId: PeerId) {
    this.peerId = peerId;
    this.onConnect.wake();
  }

  peerCandidate(peerId: PeerId) {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-candidate', { peerId, peerMetadata: {} });
  }

  peerDisconnected(peerId: PeerId) {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-disconnected', { peerId });
  }

  override send(message: Message) {
    log('send', { from: message.senderId, to: message.targetId, type: message.type });
    this._params.send(message);
  }

  override disconnect() {
    this.peerId = undefined;
  }

  receive(message: Message) {
    invariant(this.peerId, 'Peer id is not set');
    this.emit('message', message);
  }
}
