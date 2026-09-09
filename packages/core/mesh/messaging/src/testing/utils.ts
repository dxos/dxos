//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Event, asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { MessageSchema } from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { type AnyEnvelope } from '@dxos/protocols/service-contract';

import { type Message, type PeerInfo, type SignalMethods } from '../signal-methods';
import { PAYLOAD_1 } from './test-messages';

export const expectPeerAvailable = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ event, topic }) =>
        event.case === 'peerAvailable' &&
        peer.peerKey === event.value.peer?.peerKey &&
        !!topic &&
        expectedTopic.equals(topic.data),
    ),
    6000,
  );

export const expectPeerLeft = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ event, topic }) =>
        event.case === 'peerLeft' &&
        peer.peerKey === event.value.peer?.peerKey &&
        !!topic &&
        expectedTopic.equals(topic.data),
    ),
    6000,
  );

export const expectReceivedMessage = (event: Event<Message>, expectedMessage: Message) => {
  return asyncTimeout(
    event.waitFor((msg) => messageEqual(msg, expectedMessage)),
    5000,
  );
};

export const createMessage = (author: PeerInfo, recipient: PeerInfo, payload: AnyEnvelope = PAYLOAD_1): Message =>
  create(MessageSchema, { author, recipient, payload });

export const messageEqual = (msg1: Message, msg2: Message) =>
  msg1.author?.peerKey === msg2.author?.peerKey &&
  msg1.recipient?.peerKey === msg2.recipient?.peerKey &&
  !!msg1.payload &&
  !!msg2.payload &&
  PublicKey.from(msg1.payload.value).equals(msg2.payload.value);
