//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar, Button, Icon, useTranslation } from '@dxos/react-ui';
import { Card, cardText } from '@dxos/react-ui-stack';
import { type Person } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

export type RelatedContactsProps = {
  contacts: Person.Person[];
  onContactClick?: (contact: Person.Person) => void;
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
