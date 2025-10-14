//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Trigger, latch } from '@dxos/async';
import { TypedObject } from '@dxos/echo-schema';
import {
  EdgeClient,
  SwarmRequestSchema,
  SwarmRequest_Action,
  createEphemeralEdgeIdentity,
  protocol,
} from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type PeerInfo } from '@dxos/messaging';
import { EdgeService } from '@dxos/protocols';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

export class Text extends TypedObject({ typename: 'dxos.org/blade-runner/Text', version: '0.1.0' })({
  content: Schema.String,
}) {}

@trace.resource()
export class WsReplicant {
  private _edgeConnection?: EdgeClient = undefined;
  private _peerInfo?: PeerInfo = undefined;

  constructor(private readonly _env: ReplicantEnv) {}

  async initEdgeConnection({ endpoint }: { endpoint: string }): Promise<void> {
    this._edgeConnection = new EdgeClient(await createEphemeralEdgeIdentity(), {
      socketEndpoint: endpoint,
    });
    await this._edgeConnection.open();

    this._peerInfo = {
      identityKey: this._edgeConnection.identityKey,
      peerKey: this._edgeConnection.peerKey,
    };

    this._edgeConnection.onMessage((message) => {
      log.trace('dxos.ws.message.received', { message });
    });
    log.info('opened edge ws connection', { endpoint });
  }

  async destroyEdgeConnection(): Promise<void> {
    await this._edgeConnection?.close();
    this._edgeConnection = undefined;
    this._peerInfo = undefined;
  }

  async joinSwarm({ topic }: { topic: string }): Promise<void> {
    await this._edgeConnection!.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: {
          swarmKey: topic,
          ...this._peerInfo,
        },
        payload: { action: SwarmRequest_Action.JOIN, swarmKeys: [topic] },
      }),
    );

    log.info('joined swarm', { topic });
  }

  async leaveSwarm({ topic }: { topic: string }): Promise<void> {
    await this._edgeConnection!.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: {
          swarmKey: topic,
          ...this._peerInfo,
        },
        payload: { action: SwarmRequest_Action.LEAVE, swarmKeys: [topic] },
      }),
    );

    log.info('left swarm', { topic });
  }

  @trace.span()
  async testDuration({
    topic,
    messageAmount,
    waitForResponses,
  }: {
    topic: string;
    messageAmount: number;
    waitForResponses?: boolean;
  }): Promise<void> {
    invariant(this._edgeConnection, 'edgeConnection not initialized');
    const [wait, inc] = latch({ count: messageAmount, timeout: 60_000 });

    const received = new Trigger({ autoReset: true });
    let receivedAmount = 0;
    const unsubscribe = this._edgeConnection.onMessage((message) => {
      if (message.serviceId === 'TEST') {
        inc();
        received.wake();
        receivedAmount++;
        const payload = JSON.parse(Buffer.from(message.payload!.value).toString());
        log.info('dxos.ws.message.received', { payload });
      }
      if (receivedAmount % 100 === 0) {
        log.info('received message', { amountReceived: receivedAmount });
      }
    });

    for (let i = 0; i < messageAmount; i++) {
      const message = protocol.createMessage(SwarmRequestSchema, {
        serviceId: 'TEST',
        source: {
          swarmKey: topic,
          ...this._peerInfo,
        },
        payload: { action: SwarmRequest_Action.INFO, swarmKeys: [topic] },
      });
      await this._edgeConnection!.send(message);
      if (waitForResponses) {
        await received.wait();
      }
      log.trace('dxos.ws.message.sent', { message });
      if ((i + 1) % 100 === 0) {
        log.info('sent message', { amountSent: i + 1 });
      }
    }

    await wait();
    unsubscribe();
  }
}

ReplicantRegistry.instance.register(WsReplicant);
