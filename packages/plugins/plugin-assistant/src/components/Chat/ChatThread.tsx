//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useChatContext } from './ChatRoot';
import { ChatThread as NativeChatThread, type ChatThreadProps } from '../ChatThread';

export const ChatThread = (props: Omit<ChatThreadProps, 'space' | 'messages' | 'tools'>) => {
  const { space, messages, tools } = useChatContext(ChatThread.displayName);

  return <NativeChatThread {...props} space={space} messages={messages} tools={tools} />;
};

ChatThread.displayName = 'Chat.Thread';
