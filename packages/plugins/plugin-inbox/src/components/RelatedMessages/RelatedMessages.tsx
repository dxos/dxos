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

export const RelatedMessages = ({ messages, onMessageClick }: RelatedMessagesProps) => {
  const { t } = useTranslation(meta.profile.key);
  // One `now` for the whole list, so rows can't disagree about how old they are.
  const now = useMemo(() => new Date(), [messages]);
  if (!messages.length) {
    return null;
  }

  return (
    <Card.Section title={t('related-messages.title')}>
      {messages.map((message) => (
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
