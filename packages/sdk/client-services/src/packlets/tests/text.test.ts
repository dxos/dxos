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

const testBuilder = new TestBuilder();

type Model = {
  text: string;
  peers: ComplexSet<PublicKey>;
};

type Real = {
  spaceKey: PublicKey;
  peers: ComplexMap<PublicKey, Client>;
};

const assertState = async (model: Model, real: Real) => {
  // Wait for replication.
  await waitForExpect(() => {
    for (const [peerId, peer] of real.peers.entries()) {
      const space = peer.echo.getSpace(real.spaceKey);
      if (space) {
        if (!model.peers.has(peerId)) {
          throw new Error(`Expected peer to not be in space: ${peerId.truncate()}`);
        }

        const [document] = space.db.query((obj) => !!obj.content).objects;
        const text = (document.content.doc as Doc).getText('utf8');
        if (text.toString() !== model.text) {
          throw new Error(`Text mismatch: ${JSON.stringify({ expected: model.text, actual: text })}`);
        }
      } else if (model.peers.has(peerId)) {
        throw new Error(`Expected peer to be in space: ${peerId.truncate()}`);
      }
    }
  }, 10);
};

class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly peerId: PublicKey) {}

  check(model: Model) {
    return model.peers.size === 0 || model.peers.has(this.peerId);
  }

  async run(model: Model, real: Real) {
    model.peers.add(this.peerId);

    // TODO(wittjosiah): Too many steps to creat client.
    const services = testBuilder.createClientServicesHost();
    await services.open();
    afterTest(() => services.close());
    const [client, server] = testBuilder.createClientServer(services);
    void server.open();
    afterTest(() => server.close());
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity();
    if (real.peers.size === 0) {
      const space = await client.echo.createSpace();
      await space.db.add(new Document({ content: new Text() }));
      real.spaceKey = space.key;
    } else {
      const host = real.peers.get(this.peerId);
      await joinCommonSpace([host!, client], real.spaceKey);
    }
    real.peers.set(this.peerId, client);

    await assertState(model, real);
  }

  toString() {
    return `CreatePeer(peer=${this.peerId.truncate()})`;
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
  constructor(readonly peerId: PublicKey, readonly index: number, readonly text: string) {}

  check(model: Model) {
    return model.peers.has(this.peerId) && model.text.length <= this.index;
  }

  async run(model: Model, real: Real) {
    model.text = model.text.slice(0, this.index) + this.text + model.text.slice(this.index);

    const peer = real.peers.get(this.peerId);
    const space = peer!.echo.getSpace(real.spaceKey)!;
    const [document] = space.db.query((obj) => !!obj.content).objects;
    const text = (document.content.doc as Doc).getText('utf8');
    text.insert(this.index, this.text);

    await assertState(model, real);
  }

  toString() {
    const text = this.text.length > 10 ? `${this.text.slice(0, 10)}...` : this.text;
    return `InsertText(peer=${this.peerId.truncate()}, index=${this.index}, text=${text})`;
  }
}

class RemoveTextCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly peerId: PublicKey, readonly index: number, readonly length: number) {}

  check(model: Model) {
    return model.peers.has(this.peerId) && model.text.length > this.index && this.index >= this.length;
  }

  async run(model: Model, real: Real) {
    model.text = model.text.slice(0, this.index - this.length) + model.text.slice(this.index);

    const peer = real.peers.get(this.peerId);
    const space = peer!.echo.getSpace(real.spaceKey)!;
    const [document] = space.db.query((obj) => !!obj.content).objects;
    const text = (document.content.doc as Doc).getText('utf8');
    text.delete(this.index, this.length);

    await assertState(model, real);
  }

  toString() {
    return `RemoveText(peer=${this.peerId.truncate()}, index=${this.index}, length=${this.length})`;
  }
}

describe('Client text replication', () => {
  test('property-based tests', async () => {
    const peerIds = range(10).map(() => PublicKey.random());
    const peerId = fc.constantFrom(...peerIds);

    const allCommands = [
      peerId.map((peerId) => new CreatePeerCommand(peerId)),
      fc
        .tuple(peerId, fc.integer({ min: 0 }), fc.unicode())
        .map(([peerId, index, text]) => new InsertTextCommand(peerId, index, text)),
      fc
        .tuple(peerId, fc.integer({ min: 0 }), fc.integer({ min: 1 }))
        .map(([peerId, index, length]) => new RemoveTextCommand(peerId, index, length))
    ];

    await fc.assert(
      fc.asyncProperty(fc.commands(allCommands), async (commands) => {
        const setup: ModelRunSetup<Model, Real> = () => ({
          model: {
            text: '',
            peers: new ComplexSet<PublicKey>(PublicKey.hash)
          },
          real: {
            spaceKey: PublicKey.random(),
            peers: new ComplexMap<PublicKey, Client>(PublicKey.hash)
          }
        });

        await fc.asyncModelRun(setup, commands);
      }),
      {
        examples: [
          [
            [
              new CreatePeerCommand(peerIds[0]),
              new CreatePeerCommand(peerIds[1]),
              new InsertTextCommand(peerIds[0], 0, 'hello'),
              new InsertTextCommand(peerIds[1], 5, 'world')
            ]
          ]
        ]
      }
    );
  });
});
