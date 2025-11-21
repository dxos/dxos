//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Button, Icon, useTranslation } from '@dxos/react-ui';
import { Card, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type Message } from '@dxos/types';

import { meta } from '../../meta';

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
      <h3 className={mx(cardText, 'text-xs text-description uppercase font-medium')}>{t('related messages title')}</h3>
      <Card.Chrome>
        {messages.map((message) => (
          <Button
            key={message.id}
            classNames='font-normal gap-2 mbe-1 last:mbe-0'
            onClick={() => onMessageClick?.(message)}
          >
            <Icon icon='ph--envelope-simple--regular' classNames='mli-0.5' />
            <p className='min-is-0 flex-1 truncate'>{message.properties?.subject}</p>
            <Icon icon='ph--arrow-right--regular' />
          </Button>
        ))}
      </Card.Chrome>
    </>
  );
};
