//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { protocol, type MessengerClient } from '@dxos/edge-client';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  SwarmRequestSchema,
  SwarmRequest_Action,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type SwarmEvent } from '@dxos/protocols/proto/dxos/mesh/signal';

import { type SignalStatus, type Message, type SignalMethods } from '../signal-methods';

export class EdgeSignal extends Resource implements SignalMethods {
  private readonly _messengerClient: MessengerClient;

  constructor({ messengerClient }: { messengerClient: MessengerClient }) {
    super();
    this._messengerClient = messengerClient;
  }

  getStatus(): SignalStatus[] {
    throw new Error('Method not implemented.');
  }

  public swarmEvent = new Event<{ topic: PublicKey; swarmEvent: SwarmEvent }>();
  public onMessage = new Event<Message>();

  async join({ topic, peerId }: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    this._messengerClient.addListener((message) => {
      const payload = protocol.getPayload(message, SwarmResponseSchema);
      log.info('message', { message, payload });
    });
    await this._messengerClient.send(
      protocol.createMessage(SwarmRequestSchema, {
        // source: {
        //   identityKey: this._messengerClient.identityKey.toHex(),
        //   peerKey: peerId.toHex(),
        // },
        serviceId: 'swarm',
        payload: { action: SwarmRequest_Action.JOIN, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async leave(params: { topic: PublicKey; peerId: PublicKey }): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async sendMessage(message: Message): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async subscribeMessages(peerId: PublicKey): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async unsubscribeMessages(peerId: PublicKey): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
