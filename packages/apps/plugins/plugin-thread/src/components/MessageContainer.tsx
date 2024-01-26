//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Message as MessageType } from '@braneframe/types';
import { type SpaceMember } from '@dxos/client/echo';
import { PublicKey } from '@dxos/react-client';
import { Message } from '@dxos/react-ui-thread';

import { useMessageMetadata } from '../hooks';

export const MessageContainer = ({ message, members }: { message: MessageType; members: SpaceMember[] }) => {
  const identity = members.find(
    (member) => message.from.identityKey && PublicKey.equals(member.identity.identityKey, message.from.identityKey),
  )?.identity;
  const messageMetadata = useMessageMetadata(message.id, identity);
  return <Message {...messageMetadata} blocks={message.blocks ?? []} />;
};
