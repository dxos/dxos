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

/**
 * Wall-clock timestamps for the most-recent (or in-flight) request, lifted out of
 * `ChatStreamStatus` so the elapsed value survives across re-mounts triggered when wire's
 * drip queue toggles `wireDrainingEffect` (which removes/restores the footer block widget).
 * `endedAt` is `null` while the request is still active.
 */
export type ChatRequestTiming = {
  startedAt: number;
  endedAt: number | null;
};

export type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  db?: Database.Database;
  chat?: ChatModule.Chat;
  messages: Message.Message[];
  processor: AiChatProcessor;
  requestTiming: ChatRequestTiming | null;
};

// Internal: not re-exported from `Chat/index.ts`. Accessed by sibling components in this
// package (e.g. `ChatStreamStatus`) without dragging in `Chat.tsx`'s heavy transitive
// imports (transcription, etc.).
export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');
