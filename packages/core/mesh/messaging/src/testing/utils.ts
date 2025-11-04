//
// Copyright 2022 DXOS.org
//

import { type Event, asyncTimeout } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';

import { type Message, type PeerInfo, type SignalMethods } from '../signal-methods';

import { PAYLOAD_1 } from './test-messages';

export const expectPeerAvailable = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ peerAvailable, topic }) =>
        !!peerAvailable && peer.peerKey === peerAvailable.peer.peerKey && expectedTopic.equals(topic),
    ),
    6000,
  );

export const expectPeerLeft = (client: SignalMethods, expectedTopic: PublicKey, peer: PeerInfo) =>
  asyncTimeout(
    client.swarmEvent.waitFor(
      ({ peerLeft, topic }) => !!peerLeft && peer.peerKey === peerLeft.peer.peerKey && expectedTopic.equals(topic),
    ),
    6000,
  );

export const expectReceivedMessage = (event: Event<Message>, expectedMessage: Message) =>
  asyncTimeout(
    event.waitFor(
      (msg) =>
        msg.author.peerKey === expectedMessage.author.peerKey &&
        msg.recipient.peerKey === expectedMessage.recipient.peerKey &&
        PublicKey.from(msg.payload.value).equals(expectedMessage.payload.value),
    ),
    5000,
  );

export const createMessage = (author: PeerInfo, recipient: PeerInfo, payload: Any = PAYLOAD_1): Message => ({
  author,
  recipient,
  payload,
});

export const messageEqual = (msg1: Message, msg2: Message) =>
  msg1.author.peerKey === msg2.author.peerKey &&
  msg1.recipient.peerKey === msg2.recipient.peerKey &&
  PublicKey.from(msg1.payload.value).equals(msg2.payload.value);
