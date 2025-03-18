//
// Copyright 2022 DXOS.org
//

import { asyncTimeout, type Event } from '@dxos/async';
import { type Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';

import { PAYLOAD_1 } from './test-messages';
import { type Message, type PeerInfo } from '../signal-manager';

export const expectPeerAvailable = (event: Event<SwarmResponse>, expectedTopic: string, peer: PeerInfo) =>
  asyncTimeout(
    event.waitFor(
      ({ swarmKey, peers }) =>
        (!!swarmKey && swarmKey === expectedTopic && peers?.some((p) => p.peerKey === peer.peerKey)) ?? false,
    ),
    6000,
  );

export const expectPeerLeft = (event: Event<SwarmResponse>, expectedTopic: string, peer: PeerInfo) =>
  asyncTimeout(
    event.waitFor(
      ({ swarmKey, peers }) =>
        (!!swarmKey && swarmKey === expectedTopic && peers?.some((p) => p.peerKey === peer.peerKey)) ?? false,
    ),
    6000,
  );

export const expectReceivedMessage = (event: Event<Message>, expectedMessage: Message) => {
  return asyncTimeout(
    event.waitFor(
      (msg) =>
        msg.author.peerKey === expectedMessage.author.peerKey &&
        msg.recipient.peerKey === expectedMessage.recipient.peerKey &&
        PublicKey.from(msg.payload.value).equals(expectedMessage.payload.value),
    ),
    5000,
  );
};

export const createMessage = (author: PeerInfo, recipient: PeerInfo, payload: Any = PAYLOAD_1): Message => ({
  author,
  recipient,
  payload,
});

export const messageEqual = (msg1: Message, msg2: Message) =>
  msg1.author.peerKey === msg2.author.peerKey &&
  msg1.recipient.peerKey === msg2.recipient.peerKey &&
  PublicKey.from(msg1.payload.value).equals(msg2.payload.value);
