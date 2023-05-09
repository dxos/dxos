//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { asyncTimeout, sleep } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, WebsocketSignalManager } from '@dxos/messaging';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { SignalServerRunner } from '@dxos/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { runSignal } from './run-test-signal';

export type Failure = {
  error: string;
  action: ExchangedMessage | DiscoverdPeer;
};

export type ExchangedMessage = {
  type: 'MESSAGE';
  signalServers: Runtime.Services.Signal[];
  author: PublicKey;
  recipient: PublicKey;
};

export type DiscoverdPeer = {
  type: 'SWARM_EVENT';
  signalServers: Runtime.Services.Signal[];
  topic: PublicKey;
  peerThatDiscovering: PublicKey;
  peerToDiscover: PublicKey;
};

export class Stats {
  private readonly _performance = {
    failures: [] as Failure[],
    exchangedMessages: [] as ExchangedMessage[],
    discoveredPeers: [] as DiscoverdPeer[]
  };

  /**
   * Flag to prevent adding new stats after test is finished.
   */
  private _testFinished = false;

  public topics = new ComplexMap<PublicKey, ComplexSet<TestAgent>>(PublicKey.hash);

  public messageListeners = new ComplexMap<PublicKey, TestAgent>(PublicKey.hash);

  get performance() {
    return this._performance;
  }

  get shortStats() {
    return {
      failures: this.performance.failures.length,
      exchangedMessages: this.performance.exchangedMessages.length,
      discoveredPeers: this.performance.discoveredPeers.length
    };
  }

  finishTest() {
    this._testFinished = true;
  }

  addFailure(error: Error, action: ExchangedMessage | DiscoverdPeer) {
    if (!this._testFinished) {
      this.performance.failures.push({ error: error.toString(), action });
    }
  }

  addExchangedMessage(message: ExchangedMessage) {
    if (!this._testFinished) {
      this.performance.exchangedMessages.push(message);
    }
  }

  addDiscoveredPeer(peer: DiscoverdPeer) {
    if (!this._testFinished) {
      this.performance.discoveredPeers.push(peer);
    }
  }

  joinTopic(topic: PublicKey, agent: TestAgent) {
    const existingTopic = this.topics.get(topic);
    if (existingTopic) {
      existingTopic.add(agent);
    } else {
      this.topics.set(topic, new ComplexSet(TestAgent.hash, [agent]));
    }
  }

  leaveTopic(topic: PublicKey, agent: TestAgent) {
    const existingTopic = this.topics.get(topic);
    if (!existingTopic) {
      throw new Error('Topic not found');
    }
    existingTopic.delete(agent);
  }

  addMessageListener(agent: TestAgent) {
    this.messageListeners.set(agent.peerId, agent);
  }

  removeMessageListener(agent: TestAgent) {
    this.messageListeners.delete(agent.peerId);
  }
}

export class TestBuilder {
  private readonly _peers = new ComplexMap<PublicKey, TestAgent>(PublicKey.hash);
  private readonly _servers = new Map<string, SignalServerRunner>();

  get peers() {
    return Array.from(this._peers.values());
  }

  get servers() {
    return Array.from(this._servers.values());
  }

  async createPeer(params: TestAgentParams) {
    const peer = new TestAgent(params);
    await peer.start();
    this._peers.set(peer.peerId, peer);
    return peer;
  }

  async createServer(num: number, outFolder: string) {
    const server = await runSignal(num, outFolder);
    await server.waitUntilStarted();
    this._servers.set(server.url(), server);
    return server;
  }

  async destroy() {
    await Promise.all([...this._peers.values()].map((p) => p.destroy()));
    await Promise.all([...this._servers.values()].map((s) => s.stop()));
  }
}

export type TestAgentParams = {
  signals: Runtime.Services.Signal[];
  stats: Stats;
};

export class TestAgent {
  public readonly signalManager;
  public readonly peerId = PublicKey.random();
  public readonly signalServers: Runtime.Services.Signal[];
  private readonly _stats: Stats;
  private readonly _ctx = new Context();

  private readonly _topics = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  constructor({ signals, stats }: TestAgentParams) {
    this.signalServers = signals;
    this._stats = stats;
    this.signalManager = new WebsocketSignalManager(signals);
  }

  async start() {
    if (this._ctx.disposed) {
      throw new Error('Agent already destroyed');
    }

    this.signalManager.swarmEvent.on(this._ctx, ({ swarmEvent, topic: discoveredTopic }) => {
      // process.stdout.write('#')
      const peers = this._topics.get(discoveredTopic);
      if (!peers) {
        log.warn('Topic not found', { discoveredTopic });
        return;
      }
      if (swarmEvent.peerAvailable) {
        peers.add(PublicKey.from(swarmEvent.peerAvailable.peer));
      } else if (swarmEvent.peerLeft) {
        peers.delete(PublicKey.from(swarmEvent.peerLeft.peer));
      }
    });
    await this.signalManager.open();
    await this.signalManager.subscribeMessages(this.peerId);
  }

  async destroy() {
    await this._ctx.dispose();
    await this.signalManager.close();
  }

  static hash(agent: TestAgent) {
    return agent.peerId.toHex();
  }

  async joinTopic(topic: PublicKey) {
    this._topics.set(topic, new ComplexSet(PublicKey.hash));
    await this.signalManager.join({ topic, peerId: this.peerId });
    this._stats.joinTopic(topic, this);
  }

  async leaveTopic(topic: PublicKey) {
    await this.signalManager.leave({ topic, peerId: this.peerId });
    this._topics.delete(topic);
    this._stats.leaveTopic(topic, this);
  }

  async discoverPeers(topic: PublicKey, timeout = 5_000) {
    await cancelWithContext(this._ctx, sleep(timeout));

    const expectedPeers: PublicKey[] = Array.from(this._stats.topics.get(topic)?.values() ?? []).map((a) => a.peerId);
    const discoverdPeers = this._topics.get(topic) ?? new ComplexSet(PublicKey.hash);
    // log.info('discover', {
    //   expectedPeers: expectedPeers.length,
    //   discoverdPeers: discoverdPeers.size,
    // })
    for (const peer of expectedPeers) {
      if (peer.equals(this.peerId)) {
        continue;
      }
      const action: DiscoverdPeer = {
        type: 'SWARM_EVENT',
        signalServers: this.signalServers,
        topic,
        peerThatDiscovering: this.peerId,
        peerToDiscover: peer
      };
      if (!discoverdPeers.has(peer)) {
        this._stats.addFailure(new Error('Peer not discovered'), action);
      } else {
        this._stats.addDiscoveredPeer(action);
      }
    }
  }

  async sendMessage(to: TestAgent) {
    const message: Message = {
      author: this.peerId,
      recipient: to.peerId,
      payload: {
        type_url: 'example.Message',
        value: randomBytes(32)
      }
    };

    const received = to.signalManager.onMessage.waitFor((data) =>
      Buffer.from(data.payload.value).equals(Buffer.from(message.payload.value))
    );

    await this.signalManager.sendMessage(message);

    try {
      await cancelWithContext(this._ctx, asyncTimeout(received, 5_000));

      this._stats.addExchangedMessage({
        type: 'MESSAGE',
        signalServers: this.signalServers,
        author: this.peerId,
        recipient: to.peerId
      });
    } catch (err: any) {
      this._stats.addFailure(err, {
        type: 'MESSAGE',
        signalServers: this.signalServers,
        author: this.peerId,
        recipient: to.peerId
      });
    }
  }
}

export const arrayContain = (container: PublicKey[], contained: PublicKey[]) => {
  return contained.every((v) => container.some((w) => w.equals(v)));
};
