//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Chat as ChatModule } from '@dxos/assistant-toolkit';
import { type Event } from '@dxos/async';
import { type Database } from '@dxos/echo';
import { type Message } from '@dxos/types';

import { type AiChatProcessor } from '../../processor';
import { type ChatEvent } from './events';

export type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  db?: Database.Database;
  chat?: ChatModule.Chat;
  messages: Message.Message[];
  processor: AiChatProcessor;
};

// Internal: not re-exported from `Chat/index.ts`. Accessed by sibling components in this
// package (e.g. `ChatStreamStatus`) without dragging in `Chat.tsx`'s heavy transitive
// imports (transcription, etc.).
export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');
