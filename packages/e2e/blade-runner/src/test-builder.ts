//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { Context } from '@dxos/context';
import { checkType, raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message, WebsocketSignalManager } from '@dxos/messaging';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type SignalServerRunner } from '@dxos/signal';
import { ComplexMap } from '@dxos/util';

import { type TraceEvent } from './analysys';
import { runSignal } from './run-test-signal';

export class TestBuilder {
  private readonly _peers = new ComplexMap<PublicKey, TestPeer>(PublicKey.hash);
  private readonly _servers = new Map<string, SignalServerRunner>();

  get peers() {
    return Array.from(this._peers.values());
  }

  get servers() {
    return Array.from(this._servers.values());
  }

  async createPeer(params: TestAgentParams): Promise<TestPeer> {
    const peer = new TestPeer(params);
    await peer.start();
    this._peers.set(peer.peerId, peer);
    return peer;
  }

  async createSignalServer(
    num: number,
    outFolder: string,
    signalArguments: string[],
    onError?: (err: any) => void,
  ): Promise<void> {
    const server = await runSignal(num, outFolder, signalArguments, onError);
    await server.waitUntilStarted();
    this._servers.set(server.url(), server);
    return server;
  }

  async destroy(): Promise<void> {
    await Promise.all([...this._peers.values()].map((p) => p.destroy()));
    await Promise.all([...this._servers.values()].map((s) => s.stop()));
  }
}

export type TestAgentParams = {
  signals: Runtime.Services.Signal[];
  peerId?: PublicKey;
};

export class TestPeer {
  public readonly signalManager;
  public peerId: PublicKey;
  public readonly signalServers: Runtime.Services.Signal[];
  private readonly _ctx = new Context();
  constructor({ signals, peerId = PublicKey.random() }: TestAgentParams) {
    this.signalServers = signals;
    this.signalManager = new WebsocketSignalManager(signals);
    this.peerId = peerId;
  }

  regeneratePeerId(): void {
    this.peerId = PublicKey.random();
  }

  async start(): Promise<void> {
    if (this._ctx.disposed) {
      throw new Error('Agent already destroyed');
    }
    log.trace('dxos.test.signal.start', {
      eventType: 'AGENT_START',
      peerId: this.peerId,
    });

    this.signalManager.swarmEvent.on(this._ctx, ({ swarmEvent, topic }) => {
      const type = swarmEvent.peerAvailable ? 'PEER_AVAILABLE' : 'PEER_LEFT';
      const discoveredPeer = swarmEvent.peerAvailable
        ? PublicKey.from(swarmEvent.peerAvailable.peer).toHex()
        : swarmEvent.peerLeft
          ? PublicKey.from(swarmEvent.peerLeft.peer).toHex()
          : raise(new Error('Unknown peer event'));

      log.trace(
        'dxos.test.signal',
        checkType<TraceEvent>({
          peerId: this.peerId.toHex(),
          type,
          topic: topic.toHex(),
          discoveredPeer,
        }),
      );
    });

    this.signalManager.onMessage.on(this._ctx, (message) => {
      log.trace(
        'dxos.test.signal',
        checkType<TraceEvent>({
          type: 'RECEIVE_MESSAGE',
          sender: message.author.toHex(),
          receiver: message.recipient.toHex(),
          message: Buffer.from(message.payload.value).toString('hex'),
        }),
      );
    });

    await this.signalManager.open();
    await this.signalManager.subscribeMessages(this.peerId);
  }

  async destroy(): Promise<void> {
    log.trace(
      'dxos.test.signal.start',
      checkType<TraceEvent>({
        type: 'AGENT_STOP',
        peerId: this.peerId.toHex(),
      }),
    );
    await this._ctx.dispose();
    await this.signalManager.close();
  }

  static hash(agent: TestPeer): string {
    return agent.peerId.toHex();
  }

  async joinTopic(topic: PublicKey): Promise<void> {
    log.trace(
      'dxos.test.signal',
      checkType<TraceEvent>({
        type: 'JOIN_SWARM',
        topic: topic.toHex(),
        peerId: this.peerId.toHex(),
      }),
    );
    await this.signalManager.join({ topic, peerId: this.peerId });
  }

  async leaveTopic(topic: PublicKey): Promise<void> {
    log.trace(
      'dxos.test.signal',
      checkType<TraceEvent>({
        type: 'LEAVE_SWARM',
        topic: topic.toHex(),
        peerId: this.peerId.toHex(),
      }),
    );
    await this.signalManager.leave({ topic, peerId: this.peerId });
  }

  async sendMessage(to: PublicKey): Promise<void> {
    const message: Message = {
      author: this.peerId,
      recipient: to,
      payload: {
        type_url: 'example.Message',
        value: randomBytes(32),
      },
    };

    log.trace(
      'dxos.test.signal',
      checkType<TraceEvent>({
        type: 'SENT_MESSAGE',
        sender: message.author.toHex(),
        receiver: message.recipient.toHex(),
        message: Buffer.from(message.payload.value).toString('hex'),
      }),
    );
    await this.signalManager.sendMessage(message);
  }
}

export const arrayContain = (container: PublicKey[], contained: PublicKey[]) =>
  contained.every((v) => container.some((w) => w.equals(v)));
