//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { previewChrome, previewProse } from '@dxos/plugin-preview';
import { Avatar, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Contact, type MessageType } from '@dxos/schema';

import { INBOX_PLUGIN } from '../meta';

export const RelatedContacts = ({
  contacts,
  onContactClick,
}: {
  contacts: Contact[];
  onContactClick?: (contact: Contact) => void;
}) => {
  const { t } = useTranslation(INBOX_PLUGIN);
  return contacts.length ? (
    <>
      <h3 className={mx(previewProse, 'text-xs text-description uppercase font-medium')}>
        {t('related contacts title')}
      </h3>
      <ul className={previewChrome}>
        {contacts.map((contact) => (
          <Avatar.Root key={contact.id}>
            {/* TODO(thure): This should use a button. */}
            <li className='dx-button gap-2 mbe-1 last:mbe-0' onClick={() => onContactClick?.(contact)}>
              <Avatar.Content
                hue='neutral'
                size={5}
                fallback={contact.fullName}
                imgSrc={contact.image}
                icon={'ph--user--regular'}
              />
              <Avatar.Label classNames='min-is-0 flex-1 truncate'>{contact.fullName}</Avatar.Label>
              <Icon icon='ph--arrow-right--regular' />
            </li>
          </Avatar.Root>
        ))}
      </ul>
    </>
  ) : null;
};

export const RelatedMessages = ({
  messages,
  onMessageClick,
}: {
  messages: MessageType[];
  onMessageClick?: (message: MessageType) => void;
}) => {
  const { t } = useTranslation(INBOX_PLUGIN);
  return messages.length ? (
    <>
      <h3 className={mx(previewProse, 'text-xs text-description uppercase font-medium')}>
        {t('related messages title')}
      </h3>
      <ul className={previewChrome}>
        {/* TODO(thure): This should use a button. */}
        {messages.map((message) => (
          <li
            key={message.id}
            className='dx-button font-normal gap-2 mbe-1 last:mbe-0'
            onClick={() => onMessageClick?.(message)}
          >
            <Icon icon='ph--envelope-simple--regular' classNames='mli-0.5' />
            <p className='min-is-0 flex-1 truncate'>{message.properties?.subject}</p>
            <Icon icon='ph--arrow-right--regular' />
          </li>
        ))}
      </ul>
    </>
  ) : null;
};
