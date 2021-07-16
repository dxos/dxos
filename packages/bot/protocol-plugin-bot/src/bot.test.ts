//
// Copyright 2020 DXOS.org
//

import crypto from 'crypto';
import generator from 'ngraph.generators';
import pump from 'pump';
import waitForExpect from 'wait-for-expect';

import { keyToString } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

import { BotPlugin } from './bot';
import { createSpawnCommand } from './botkit-messages';
import { Message } from './proto';

const random = <T> (arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const createNode = async (topic: Buffer) => {
  const peerId = crypto.randomBytes(32);
  const commands: Message[] = [];
  const bot = new BotPlugin(peerId, (protocol, command) => {
    commands.push(command);
  });

  return {
    id: peerId,
    bot,
    commands,
    replicate (options: any) {
      return new Protocol({ ...options, discoveryKey: topic, userSession: { peerId: keyToString(peerId) } })
        .setExtensions([bot.createExtension()])
        .init()
        .stream;
    }
  };
};

const createPeers = async (topic: Buffer, graph: any) => {
  const peers: any[] = [];
  graph.forEachNode((node: any) => {
    peers.push(node);
  });

  return Promise.all(peers.map(async (node) => {
    node.data = await createNode(topic);
    return node.data;
  }));
};

const createConnections = (graph: any): Promise<any[]> => {
  const options = {
    streamOptions: {
      live: true
    }
  };

  let count = graph.getLinksCount();

  return new Promise(resolve => {
    const connections: any[] = [];

    graph.forEachLink((link: any) => {
      const fromNode = graph.getNode(link.fromId).data;
      const toNode = graph.getNode(link.toId).data;
      const r1 = fromNode.replicate({ ...options, initiator: true });
      const r2 = toNode.replicate({ ...options, initiator: false });
      link.data = pump(r1, r2, r1);
      link.data.on('handshake', () => {
        count--;
        connections.push(link.data);
        if (count === 0) {
          resolve(connections);
        }
      });
    });
  });
};

describe('test peers in a network graph of 15 peers', () => {
  const topic = crypto.randomBytes(32);
  let graph, peers: any[], connections: any[];

  const command = createSpawnCommand('wrn://dxos/bot/chess');

  beforeAll(async () => {
    graph = generator.balancedBinTree(3);
    peers = await createPeers(topic, graph);
    connections = await createConnections(graph);
  });

  test('bot commands', async () => {
    const peer1 = random(peers);

    await waitForExpect(() => {
      expect(peer1.bot.peers.length).toBeGreaterThan(0);
    });
    let peer2: any = random(peer1.bot.peers);
    peer2 = peers.find(p => p.id.equals(peer2));
    expect(peer2).toBeDefined();

    peer1.bot.sendCommand(peer2.id, command);

    await waitForExpect(() => {
      expect(peer2.commands).toEqual([command]);
    });

    peer2.commands.length = 0;

    await peer1.bot.broadcastCommand(command);

    await waitForExpect(() => {
      peers.forEach(peer => {
        if (peer === peer1) {
          return;
        }
        expect(peer.commands).toEqual([command]);
      });
    }, 10000, 5000);

    peers.forEach(peer => peer.bot._broadcast.close());
    connections.forEach(c => c.destroy());
  });
});
