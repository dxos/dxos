//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Card, useTranslation } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

import { formatAge } from '../../util';

export type RelatedMessagesProps = {
  messages: Message.Message[];
  onMessageClick?: (message: Message.Message) => void;
};

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

export const RelatedMessages = ({ messages, onMessageClick }: RelatedMessagesProps) => {
  const { t } = useTranslation(meta.profile.key);
  // One `now` for the whole list, so rows can't disagree about how old they are.
  const now = useMemo(() => new Date(), [messages]);
  const conversations = useMemo(() => latestPerConversation(messages), [messages]);
  if (!conversations.length) {
    return null;
  }

  return (
    <Card.Section title={t('related-messages.title')}>
      {conversations.map((message) => (
        <Card.Action
          key={message.id}
          label={message.properties?.subject}
          annotation={message.created ? formatAge(new Date(message.created), now) : undefined}
          icon='ph--envelope-simple--regular'
          actionIcon='ph--arrow-right--regular'
          onClick={() => onMessageClick?.(message)}
        />
      ))}
    </Card.Section>
  );
};
