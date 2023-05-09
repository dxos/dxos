//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { Context } from '@dxos/context';
import { checkType } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, WebsocketSignalManager } from '@dxos/messaging';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { SignalServerRunner } from '@dxos/signal';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { TraceEvent } from './analysys/reducer';
import { runSignal } from './run-test-signal';

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
  peerId?: PublicKey;
};

export class TestAgent {
  public readonly signalManager;
  public readonly peerId: PublicKey;
  public readonly signalServers: Runtime.Services.Signal[];
  private readonly _ctx = new Context();

  private readonly _topics = new ComplexMap<PublicKey, ComplexSet<PublicKey>>(PublicKey.hash);

  constructor({ signals, peerId = PublicKey.random() }: TestAgentParams) {
    this.signalServers = signals;
    this.signalManager = new WebsocketSignalManager(signals);
    this.peerId = peerId;
  }

  async start() {
    if (this._ctx.disposed) {
      throw new Error('Agent already destroyed');
    }
    log.trace('dxos.test.signal.start', {
      eventType: 'AGENT_START',
      peerId: this.peerId
    });

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

    this.signalManager.onMessage.on(this._ctx, (message) => {
      log.trace(
        'dxos.test.signal',
        checkType<TraceEvent>({
          type: 'RECEIVE_MESSAGE',
          sender: message.author.toHex(),
          receiver: message.recipient.toHex(),
          message: Buffer.from(message.payload.value).toString('hex')
        })
      );
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
  }

  async leaveTopic(topic: PublicKey) {
    await this.signalManager.leave({ topic, peerId: this.peerId });
    this._topics.delete(topic);
  }

  async sendMessage(to: PublicKey) {
    const message: Message = {
      author: this.peerId,
      recipient: to,
      payload: {
        type_url: 'example.Message',
        value: randomBytes(32)
      }
    };

    log.trace(
      'dxos.test.signal',
      checkType<TraceEvent>({
        type: 'SENT_MESSAGE',
        sender: message.author.toHex(),
        receiver: message.recipient.toHex(),
        message: Buffer.from(message.payload.value).toString('hex')
      })
    );
    await this.signalManager.sendMessage(message);
  }
}

export const arrayContain = (container: PublicKey[], contained: PublicKey[]) => {
  return contained.every((v) => container.some((w) => w.equals(v)));
};
