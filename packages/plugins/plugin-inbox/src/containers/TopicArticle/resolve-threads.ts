//
// Copyright 2026 DXOS.org
//

import { type Topic, deriveThreadId } from '@dxos/pipeline-email';
import { type Message } from '@dxos/types';

/** A topic's member thread resolved back to its mailbox messages (oldest first). */
export type TopicThread = {
  readonly threadId: string;
  readonly subject: string;
  readonly messages: Message.Message[];
};

/**
 * Resolve a topic's string `threadIds` back to mailbox messages. `Topic.threadIds` are the pipeline's
 * derived thread ids (normalized subjects), so the messages are grouped by the same {@link deriveThreadId}
 * and only the buckets the topic references are returned — in the topic's `threadIds` order, skipping any
 * thread with no messages in the current feed. Pure.
 */
export const resolveTopicThreads = (
  topic: Pick<Topic, 'threadIds'>,
  messages: readonly Message.Message[],
): TopicThread[] => {
  const wanted = new Set(topic.threadIds);
  const byThread = new Map<string, Message.Message[]>();
  for (const message of messages) {
    const threadId = deriveThreadId(message);
    if (!wanted.has(threadId)) {
      continue;
    }
    const bucket = byThread.get(threadId);
    if (bucket) {
      bucket.push(message);
    } else {
      byThread.set(threadId, [message]);
    }
  }

  return topic.threadIds.flatMap((threadId) => {
    const bucket = byThread.get(threadId);
    if (!bucket || bucket.length === 0) {
      return [];
    }
    const ordered = [...bucket].sort((left, right) => left.created.localeCompare(right.created));
    const subject = typeof ordered[0].properties?.subject === 'string' ? ordered[0].properties.subject : threadId;
    return [{ threadId, subject, messages: ordered }];
  });
};
