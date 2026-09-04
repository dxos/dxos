//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';

import { type Alarm } from '@dxos/assistant';
import type * as ChatModule from '@dxos/assistant/Chat';
import { type Event } from '@dxos/async';
import { type Database } from '@dxos/echo';
import { type ChatThreadController } from '@dxos/react-ui-assistant';
import { type MessageRange } from '@dxos/react-ui-feed';
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
  /** Queued input the agent has not taken up yet, in append order. */
  queued: Message.Message[];
  /** Alarms still waiting to fire, earliest first. */
  alarms: Alarm.Alarm[];
  /** Removes a queued message or a pending alarm from the feed. */
  onCancel: (item: Message.Message | Alarm.Alarm) => void;
  processor: AiChatProcessor;
  requestTiming: ChatRequestTiming | null;
  /** The thread's controller, shared between `Chat.Thread` and `Chat.Outline`. */
  controller: ChatThreadController | null;
  setController: (controller: ChatThreadController | null) => void;
  /** The visible index range, published by `Chat.Thread` as the reader scrolls. */
  visibleRange?: MessageRange;
  setVisibleRange: (range: MessageRange | undefined) => void;
};

// Internal: not re-exported from `Chat/index.ts`. Accessed by sibling components in this
// package (e.g. `ChatStreamStatus`) without dragging in `Chat.tsx`'s heavy transitive
// imports (transcription, etc.).
export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');
