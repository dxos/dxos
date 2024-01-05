//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { type Message, NetworkAdapter, type PeerId, Repo } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';

import { AutomergeHost } from './automerge-host';

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
    type Context = { client: Trigger<TestAdapter>; host: Trigger<TestAdapter> };
    const context: Context = {
      client: new Trigger<TestAdapter>(),
      host: new Trigger<TestAdapter>(),
    };
    const hostAdapter = new TestAdapter(context, 'host');
    const clientAdapter = new TestAdapter(context, 'client');

    const host = new Repo({
      network: [hostAdapter],
    });
    const client = new Repo({
      network: [clientAdapter],
    });
    hostAdapter.ready();
    clientAdapter.ready();

    const handle = host.create();
    const text = 'Hello world';
    handle.change((doc: any) => {
      doc.text = text;
    });

    const docOnClient = client.find(handle.url);
    await asyncTimeout(docOnClient.whenReady(), 3_000);
    expect(docOnClient.docSync().text).toEqual(text);
  });

  test('doubled connection', async () => {});
});

type Context = { client: Trigger<TestAdapter>; host: Trigger<TestAdapter> };

class TestAdapter extends NetworkAdapter {
  constructor(public readonly context: Context, public readonly role: 'host' | 'client') {
    super();
  }

  // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
  //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
  ready() {
    this.emit('ready', { network: this });
  }

  override connect(peerId: PeerId) {
    this.peerId = peerId;
    this.context[this.role].wake(this);
    this.context[this.role === 'host' ? 'client' : 'host']
      .wait()
      .then((adapter) => {
        invariant(adapter.peerId, 'Peer id is not set');
        this.emit('peer-candidate', { peerId: adapter.peerId });
      })
      .catch((error) => {
        log.catch(error);
      });
  }

  override send(message: Message) {
    this.context[this.role === 'host' ? 'client' : 'host']
      .wait()
      .then((adapter) => {
        adapter.receive(message);
      })
      .catch((error) => {
        log.catch(error);
      });
  }

  override disconnect() {
    this.peerId = undefined;
    this.context[this.role].reset();
  }

  receive(message: Message) {
    invariant(this.peerId, 'Peer id is not set');
    this.emit('message', message);
  }
}
