//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Card, useTranslation } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { formatAge } from '../../util/index.ts';

export type RelatedMessagesProps = {
  messages: Message.Message[];
  /** Derived summary per message id, when the summarization pipeline has produced one. */
  summaries?: ReadonlyMap<string, string>;
  onMessageClick?: (message: Message.Message) => void;
};

/**
 * What a row says about a message, best first: the derived summary, else the provider's snippet, else
 * the subject.
 *
 * The subject is last because it carries no information here — the section already collapses a thread
 * to one row, and every row in a thread repeats the same `Re: …`. Snippet is set by both the Gmail and
 * JMAP mappers, so the middle rung is populated for synced mail even before any summarization runs.
 */
export const messageDigest = (message: Message.Message, summaries?: ReadonlyMap<string, string>): string | undefined =>
  summaries?.get(message.id) ?? message.properties?.snippet ?? message.properties?.subject;

/**
 * Latest message per conversation, newest first. A thread otherwise fills the whole section with
 * near-identical `Re: …` rows for what the reader thinks of as one exchange; messages with no
 * `threadId` are their own conversation rather than being collapsed together.
 */
export const latestPerConversation = (messages: Message.Message[]): Message.Message[] => {
  const latest = new Map<string, Message.Message>();
  for (const message of messages) {
    // Top-level `threadId` is the field the mailbox's thread aggregate groups on, so this section
    // collapses exactly the same way the conversation view does.
    const key = message.threadId ?? message.id;
    const existing = latest.get(key);
    if (!existing || (message.created ?? '') > (existing.created ?? '')) {
      latest.set(key, message);
    }
  }
  return [...latest.values()].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));
};

export const RelatedMessages = ({ messages, summaries, onMessageClick }: RelatedMessagesProps) => {
  const { t } = useTranslation(meta.profile.key);
  // One `now` for the whole list, so rows can't disagree about how old they are.
  const now = useMemo(() => new Date(), [messages]);
  // A row with nothing to say is dropped rather than rendered blank — `Card.Action` needs a label,
  // and an empty one reads as a broken row rather than an absent message.
  const conversations = useMemo(
    () => latestPerConversation(messages).filter((message) => messageDigest(message, summaries) !== undefined),
    [messages, summaries],
  );
  if (!conversations.length) {
    return null;
  }

  return (
    <Card.Section title={t('related-messages.title')}>
      {conversations.map((message) => (
        <Card.Action
          key={message.id}
          label={messageDigest(message, summaries) ?? ''}
          annotation={message.created ? formatAge(new Date(message.created), now) : undefined}
          icon='ph--envelope-simple--regular'
          actionIcon='ph--arrow-right--regular'
          onClick={() => onMessageClick?.(message)}
        />
      ))}
    </Card.Section>
  );
};
