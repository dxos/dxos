//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { meta } from '#meta';

export type RelatedMessagesProps = {
  messages: Message.Message[];
  onMessageClick?: (message: Message.Message) => void;
};

export const RelatedMessages = ({ messages, onMessageClick }: RelatedMessagesProps) => {
  const { t } = useTranslation(meta.id);
  if (!messages.length) {
    return null;
  }

  return (
    <>
      <Card.Row>
        <Card.Heading variant='subtitle'>{t('related-messages.title')}</Card.Heading>
      </Card.Row>
      {messages.map((message) => (
        <Card.Action
          key={message.id}
          label={message.properties?.subject}
          icon='ph--envelope-simple--regular'
          actionIcon='ph--arrow-right--regular'
          onClick={() => onMessageClick?.(message)}
        />
      ))}
    </>
  );
};
