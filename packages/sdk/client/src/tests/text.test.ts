//
// Copyright 2023 DXOS.org
//

import * as fc from 'fast-check';
import { ModelRunSetup } from 'fast-check';
import waitForExpect from 'wait-for-expect';

import { Context } from '@dxos/context';
import { Expando, Text } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';
import { Doc } from '@dxos/text-model';
import { ComplexMap, ComplexSet, range } from '@dxos/util';

import { Client } from '../client';
import { joinCommonSpace, TestBuilder } from '../testing';

// log.config({ filter: 'text.test:debug,error' });

const testBuilder = new TestBuilder();
const initialContent = 'Hello, world!';

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
      const space = peer.spaces.get(real.spaceKey);
      if (space) {
        if (!model.peers.has(peerId)) {
          throw new Error(`Expected peer to not be in space: ${peerId.truncate()}`);
        }

        const [document] = space.db.query((obj) => !!obj.content).objects;
        const text = (document.content.doc as Doc).getText('utf8');
        if (text.toString() !== model.text) {
          throw new Error(
            `Text mismatch for peer ${peerId.truncate()}: ${JSON.stringify({ expected: model.text, actual: text })}`,
          );
        }
      } else if (model.peers.has(peerId)) {
        throw new Error(`Expected peer to be in space: ${peerId.truncate()}`);
      }
    }
  }, 1000);
};

class CreatePeerCommand implements fc.AsyncCommand<Model, Real> {
  constructor(readonly peerId: PublicKey) {}

  check(model: Model) {
    return model.peers.size === 0 || !model.peers.has(this.peerId);
  }

  async run(model: Model, real: Real) {
    log.debug('run', { command: this.toString() });
    model.peers.add(this.peerId);

    // TODO(wittjosiah): Too many steps to creat client.
    const services = testBuilder.createClientServicesHost();
    await services.open(new Context());
    const [client, server] = testBuilder.createClientServer(services);
    void server.open();
    await client.initialize();
    await client.halo.createIdentity();
    if (real.peers.size === 0) {
      const space = await client.spaces.create();
      const content = new Text();
      content.doc?.getText('utf8').insert(0, initialContent);
      await space.db.add(new Expando({ content }));
      real.spaceKey = space.key;
    } else {
      const host = Array.from(real.peers.values())[0];
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
    return model.peers.has(this.peerId) && model.text.length >= this.index;
  }

  async run(model: Model, real: Real) {
    log.debug('run', { command: this.toString() });
    model.text = model.text.slice(0, this.index) + this.text + model.text.slice(this.index);

    const peer = real.peers.get(this.peerId);
    const space = peer!.spaces.get(real.spaceKey)!;
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
    return model.peers.has(this.peerId) && model.text.length > this.index + this.length;
  }

  async run(model: Model, real: Real) {
    log.debug('run', { command: this.toString() });
    model.text = model.text.slice(0, this.index) + model.text.slice(this.index + this.length);

    const peer = real.peers.get(this.peerId);
    const space = peer!.spaces.get(real.spaceKey)!;
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
    // TODO(wittjosiah): Increasing to 5 causes failures.
    const peerIds = range(3).map(() => PublicKey.random());
    const peerId = fc.constantFrom(...peerIds);

    const allCommands = [
      peerId.map((peerId) => new CreatePeerCommand(peerId)),
      fc
        .tuple(peerId, fc.integer({ min: 0, max: 100 }), fc.unicodeString())
        .map(([peerId, index, text]) => new InsertTextCommand(peerId, index, text)),
      fc
        .tuple(peerId, fc.integer({ min: 0, max: 100 }), fc.integer({ min: 1, max: 10 }))
        .map(([peerId, index, length]) => new RemoveTextCommand(peerId, index, length)),
    ];
    const commands = fc.commands(allCommands, { size: 'medium' });

    const model = fc.asyncProperty(commands, async (commands) => {
      const peers = new ComplexMap<PublicKey, Client>(PublicKey.hash);
      const setup: ModelRunSetup<Model, Real> = () => ({
        model: {
          text: initialContent,
          peers: new ComplexSet<PublicKey>(PublicKey.hash),
        },
        real: {
          spaceKey: PublicKey.random(),
          peers,
        },
      });

      await fc.asyncModelRun(setup, commands);

      await Promise.all(Array.from(peers.values()).map((peer) => peer.destroy()));
    });

    const examples: [commands: Iterable<fc.AsyncCommand<Model, Real, boolean>>][] = [
      [
        [
          new CreatePeerCommand(peerIds[0]),
          new CreatePeerCommand(peerIds[1]),
          new RemoveTextCommand(peerIds[0], 7, 5),
          new InsertTextCommand(peerIds[1], 7, 'DXOS'),
        ],
      ],
    ];

    await fc.assert(model, { examples });
  })
    .onlyEnvironments('node')
    .timeout(300_000);
});
