//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type AiService } from '@dxos/ai';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { generateText } from './llm';
import { type ModelVariant } from './models';

export type MessageThread = {
  readonly threadId: string;
  readonly messages: readonly Message.Message[];
};

export type ThreadSummaryResult = {
  readonly threadId: string;
  readonly messageCount: number;
  readonly summary: string;
};

/** Groups messages into threads by `threadId`; un-threaded messages each form their own thread. */
export const groupThreads = (messages: readonly Message.Message[]): MessageThread[] => {
  const byThread = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const key = message.threadId ?? message.id;
    const bucket = byThread.get(key);
    if (bucket) {
      bucket.push(message);
    } else {
      byThread.set(key, [message]);
    }
  }
  return [...byThread.entries()].map(([threadId, msgs]) => ({ threadId, messages: msgs }));
};

const PROMPT = trim`
  Summarize the following email thread in two or three sentences: what it is about, who is involved,
  and any decisions or outstanding items. Respond with ONLY the summary text.
`;

const renderThread = (thread: MessageThread): string =>
  thread.messages
    .map((message, index) => {
      const subject = String(message.properties?.subject ?? '');
      return `--- Message ${index + 1} (from ${message.sender.email ?? 'unknown'}${subject ? `, subject: ${subject}` : ''}) ---\n${Message.extractText(message)}`;
    })
    .join('\n\n');

/** Summarizes one thread (its concatenated messages) via the variant's model. */
export const summarizeThread = (
  thread: MessageThread,
  variant: ModelVariant,
): Effect.Effect<ThreadSummaryResult, never, AiService.AiService> =>
  Effect.gen(function* () {
    const summary = (yield* generateText(
      variant.model,
      variant.provider,
      `${PROMPT}\n\n${renderThread(thread)}`,
    )).trim();
    return { threadId: thread.threadId, messageCount: thread.messages.length, summary };
  });
