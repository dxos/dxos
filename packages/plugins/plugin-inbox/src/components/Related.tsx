//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar, Button, Icon, useTranslation } from '@dxos/react-ui';
import { Card, cardText } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { type DataType } from '@dxos/schema';

import { meta } from '../meta';

export type RelatedContactsProps = {
  contacts: DataType.Person[];
  onContactClick?: (contact: DataType.Person) => void;
};

export const RelatedContacts = ({ contacts, onContactClick }: RelatedContactsProps) => {
  const { t } = useTranslation(meta.id);
  if (!contacts.length) {
    return null;
  }

  return (
    <>
      <h3 className={mx(cardText, 'text-xs text-description uppercase font-medium')}>{t('related contacts title')}</h3>
      <Card.Chrome>
        {contacts.map((contact) => (
          <Avatar.Root key={contact.id}>
            <Button classNames='gap-2 mbe-1 last:mbe-0' onClick={() => onContactClick?.(contact)}>
              <Avatar.Content
                hue='neutral'
                size={5}
                fallback={contact.fullName}
                imgSrc={contact.image}
                icon={'ph--user--regular'}
              />
              <Avatar.Label classNames='min-is-0 flex-1 truncate'>{contact.fullName}</Avatar.Label>
              <Icon icon='ph--arrow-right--regular' />
            </Button>
          </Avatar.Root>
        ))}
      </Card.Chrome>
    </>
  );
};

export type RelatedMessagesProps = {
  messages: DataType.Message[];
  onMessageClick?: (message: DataType.Message) => void;
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
