//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { ThreadContainer } from './Thread';
import { type AIChatType } from '../types';

// TODO(burdon): Attention.
export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  return (
    <StackItem.Content toolbar={false} role={role} classNames='mli-auto w-full max-w-[50rem]'>
      <ThreadContainer chat={chat} />
    </StackItem.Content>
  );
};

export default ChatContainer;
