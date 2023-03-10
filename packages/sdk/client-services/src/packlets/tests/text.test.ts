//
// Copyright 2023 DXOS.org
//

import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { Client, Document, Text } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { afterTest, describe, test } from '@dxos/test';
import { Doc } from '@dxos/text-model';
import { ComplexMap, ComplexSet, range } from '@dxos/util';

import { joinCommonSpace, TestBuilder } from '../testing';

type Model = {
  text: string;
  peers: ComplexSet<PublicKey>;
};

type Real = {
  spaceKey: PublicKey;
  peers: ComplexMap<PublicKey, Client>;
};

const assertState = async (model: Model, real: Real) => {
  await waitForExpect(() => {
    for (const peer of real.peers.values()) {
      const space = peer.echo.getSpace(real.spaceKey);
      if (space) {
        if (!model.peers.has(peer.halo.identity!.identityKey)) {
          throw new Error(`Expected peer to not be in space: ${peer.halo.identity!.identityKey.truncate()}`);
        }

        const [document] = space.db.query((obj) => !!obj.content).objects;
        const text = (document.content.doc as Doc).getText('utf8');
        if (text.toString() !== model.text) {
          throw new Error(`Expected text to be "${model.text}" but was "${text}."`);
        }
      } else if (model.peers.has(peer.halo.identity!.identityKey)) {
        throw new Error(`Expected peer to be in space: ${peer.halo.identity!.identityKey.truncate()}`);
      }
    }
  }, 1000);
};

class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly host: Client, readonly guest: Client) {}

  check(model: Model) {
    return (
      !this.host.halo.identity!.identityKey.equals(this.guest.halo.identity!.identityKey) &&
      model.peers.has(this.host.halo.identity!.identityKey) &&
      !model.peers.has(this.guest.halo.identity!.identityKey)
    );
  }

  async run(model: Model, real: Real) {
    console.log('create peer', { host: this.host, guest: this.guest, model, real });
    model.peers.add(this.guest.halo.identity!.identityKey);

    await joinCommonSpace([this.host, this.guest], real.spaceKey);

    await assertState(model, real);
  }

  toString() {
    const host = this.host.halo.identity!.identityKey.truncate();
    const guest = this.guest.halo.identity!.identityKey.truncate();
    return `CreateMember(host=${host}, guest=${guest})`;
  }
}

// TODO(wittjosiah)
// class OfflineMemberCommand implements fc.AsyncCommand<Model, Real> {
//   constructor(readonly peer: Client) {}
// }

// TODO(wittjosiah)
// class OnlineMemberCommand implements fc.AsyncCommand<Model, Real> {
//   constructor(readonly peer: Client) {}
// }

class InsertTextCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly peer: Client, readonly index: number, readonly text: string) {}

  check(model: Model) {
    return model.peers.has(this.peer.halo.identity!.identityKey) && model.text.length <= this.index;
  }

  async run(model: Model, real: Real) {
    model.text = model.text.slice(0, this.index) + this.text + model.text.slice(this.index);

    const space = this.peer.echo.getSpace(real.spaceKey)!;
    const [document] = space.db.query((obj) => !!obj.content).objects;
    const text = (document.content.doc as Doc).getText('utf8');
    text.insert(this.index, this.text);

    await assertState(model, real);
  }

  toString() {
    const peer = this.peer.halo.identity!.identityKey.truncate();
    const text = this.text.length > 10 ? `${this.text.slice(0, 10)}...` : this.text;
    return `InsertText(peer=${peer}, index=${this.index}, text=${text})`;
  }
}

class RemoveTextCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly peer: Client, readonly index: number, readonly length: number) {}

  check(model: Model) {
    return (
      model.peers.has(this.peer.halo.identity!.identityKey) &&
      model.text.length <= this.index &&
      this.index >= this.length
    );
  }

  async run(model: Model, real: Real) {
    model.text = model.text.slice(0, this.index - length) + model.text.slice(this.index);

    const space = this.peer.echo.getSpace(real.spaceKey)!;
    const [document] = space.db.query((obj) => !!obj.content).objects;
    const text = (document.content.doc as Doc).getText('utf8');
    text.delete(this.index, this.length);

    await assertState(model, real);
  }

  toString() {
    const peer = this.peer.halo.identity?.identityKey.truncate();
    return `RemoveText(peer=${peer}, index=${this.index}, length=${this.length})`;
  }
}

describe.only('Client text replication', () => {
  test('property-based tests', async () => {
    const testBuilder = new TestBuilder();
    const host = testBuilder.createClientServicesHost();
    await host.open();
    afterTest(() => host.close());
    const [client, server] = testBuilder.createClientServer(host);
    void server.open();
    afterTest(() => server.close());
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();
    const space = await client.echo.createSpace();
    await space.db.add(new Document({ content: new Text() }));

    const peers = await Promise.all(
      range(10).map(async () => {
        const host = testBuilder.createClientServicesHost();
        await host.open();
        afterTest(() => host.close());
        const [client, server] = testBuilder.createClientServer(host);
        void server.open();
        afterTest(() => server.close());
        await client.initialize();
        afterTest(() => client.destroy());
        await client.halo.createIdentity();
        return client;
      })
    );
    const peer = fc.constantFrom(...peers);

    const allCommands = [
      peer.map((peer) => new CreatePeerCommand(client, peer)),
      fc.tuple(peer, fc.integer(), fc.unicode()).map(([peer, index, text]) => new InsertTextCommand(peer, index, text)),
      fc
        .tuple(peer, fc.integer(), fc.integer())
        .map(([peer, index, length]) => new RemoveTextCommand(peer, index, length))
    ];

    await fc.assert(
      fc.asyncProperty(fc.commands(allCommands), async (commands) => {
        const setup: ModelRunSetup<Model, Real> = () => {
          const model = {
            text: '',
            peers: new ComplexSet<PublicKey>(PublicKey.hash)
          };
          const real = {
            spaceKey: space.key,
            peers: new ComplexMap<PublicKey, Client>(PublicKey.hash)
          };

          model.peers.add(client.halo.identity!.identityKey);
          real.peers.set(client.halo.identity!.identityKey, client);

          return { model, real };
        };

        await fc.asyncModelRun(setup, commands);
      }),
      {
        examples: [
          [
            [
              new CreatePeerCommand(client, peers[0]),
              new InsertTextCommand(peers[0], 0, 'hello'),
              new InsertTextCommand(peers[0], 5, 'world')
            ]
          ]
        ]
      }
    );
  });
});
