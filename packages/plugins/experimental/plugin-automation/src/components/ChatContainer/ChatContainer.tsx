//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { type AIChatType } from '../../types';
import { ThreadContainer } from '../Thread';

// TODO(burdon): Attention.
export const ChatContainer = ({ chat, role }: { chat: AIChatType; role: string }) => {
  return (
    <StackItem.Content toolbar={false} role={role} classNames='mli-auto w-full max-w-[50rem]'>
      <ThreadContainer chat={chat} />
    </StackItem.Content>
  );
};
