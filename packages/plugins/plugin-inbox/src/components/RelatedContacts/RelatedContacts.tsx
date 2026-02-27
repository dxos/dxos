//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { type Person } from '@dxos/types';

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
      <Card.Heading variant='subtitle'>{t('related contacts title')}</Card.Heading>
      {contacts.map((contact) => (
        <Card.Action
          key={contact.id}
          onClick={() => onContactClick?.(contact)}
          label={contact.fullName || contact.emails?.[0].value || contact.id}
          icon='ph--user--regular'
          actionIcon='ph--arrow-right--regular'
        />
      ))}
    </>
  );
};
