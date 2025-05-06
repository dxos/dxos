//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { previewChrome, previewProse } from '@dxos/plugin-preview';
import { Avatar, Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type Contact } from '@dxos/schema';

import { INBOX_PLUGIN } from '../meta';

export const RelatedContacts = ({ contacts }: { contacts: Contact[] }) => {
  const { t } = useTranslation(INBOX_PLUGIN);
  return contacts.length ? (
    <>
      <h3 className={mx(previewProse, 'text-xs text-description uppercase font-medium')}>
        {t('related contacts title')}
      </h3>
      <ul className={previewChrome}>
        {contacts.map((contact) => (
          <Avatar.Root key={contact.id}>
            {/* TODO(thure): This should become a link. */}
            <li className='dx-button gap-2 mbe-1 last:mbe-0'>
              <Avatar.Content
                hue='neutral'
                size={5}
                fallback={contact.fullName}
                imgSrc={contact.image}
                icon={'ph--user--regular'}
              />
              <Avatar.Label classNames='grow'>{contact.fullName}</Avatar.Label>
              <Icon icon='ph--arrow-right--regular' />
            </li>
          </Avatar.Root>
        ))}
      </ul>
    </>
  ) : null;
};
