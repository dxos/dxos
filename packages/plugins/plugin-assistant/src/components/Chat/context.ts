//
// Copyright 2026 DXOS.org
//

import { type Alarm } from '@dxos/assistant';
import type * as ChatModule from '@dxos/assistant/Chat';
import { type Event } from '@dxos/async';
import { type Database } from '@dxos/echo';
import { createContext } from '@dxos/react-hooks';
import { type ChatThreadController } from '@dxos/react-ui-assistant';
import { type MessageRange } from '@dxos/react-ui-feed';
import { type Message } from '@dxos/types';

import { type AiChatProcessor } from '../../processor/index.ts';
import { type ChatEvent } from './events.ts';

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

/**
 * What the chat's parts act through: handles that hold still for the life of the chat. Kept apart
 * from {@link ChatThreadContextValue}, which changes with every streamed block — a consumer
 * re-renders whenever its context does, so the toolbar, the composer and the checklist re-rendered
 * per block of every turn when the two were one context.
 */
export type ChatContextValue = {
  debug?: boolean;
  event: Event<ChatEvent>;
  db?: Database.Database;
  chat?: ChatModule.Chat;
  /** Undefined while the processor is still opening; the chat renders from the feed meanwhile. */
  processor?: AiChatProcessor;
  /** How many prompts wait behind the running turn; a count, so it changes per enqueue rather than per block. */
  queueSize: number;
  setController: (controller: ChatThreadController | null) => void;
  setVisibleRange: (range: MessageRange | undefined) => void;
};

/** What the chat currently shows: the projected thread and the state that moves with it. */
export type ChatThreadContextValue = {
  messages: Message.Message[];
  /** How many rows at the end of `messages` are prompts the agent has not taken up yet. */
  tail: number;
  /** Alarms still waiting to fire, earliest first. */
  alarms: Alarm.Alarm[];
  /** Alarms that have woken the agent since the last user prompt. */
  selfWakes: number;
  requestTiming: ChatRequestTiming | null;
  /** The thread's controller, shared between `Chat.Thread` and `Chat.Outline`. */
  controller: ChatThreadController | null;
  /** The visible index range, published by `Chat.Thread` as the reader scrolls. */
  visibleRange?: MessageRange;
};

// Internal: not re-exported from `Chat/index.ts`. Accessed by sibling components in this
// package (e.g. `ChatStreamStatus`) without dragging in `Chat.tsx`'s heavy transitive
// imports (transcription, etc.).
export const [ChatContextProvider, useChatContext] = createContext<ChatContextValue>('Chat');

export const [ChatThreadContextProvider, useChatThreadContext] = createContext<ChatThreadContextValue>('ChatThread');

/**
 * Report path for agent-requested surfaces rendered inside the thread (`<surface>` blocks): a
 * completed inline flow (a connector authorized, a plugin enabled) has to reach the agent, which
 * otherwise waits on a click it never observes. `submit` posts the report as an ordinary user turn.
 */
export type ChatReportContextValue = {
  submit: (text: string) => void;
};

// Defaulted (unlike `ChatContext`) so a surface rendered outside a chat — a storybook, a standalone
// preview — drops its report instead of throwing.
export const [ChatReportContextProvider, useChatReportContext] = createContext<ChatReportContextValue>('ChatReport', {
  submit: () => {},
});
