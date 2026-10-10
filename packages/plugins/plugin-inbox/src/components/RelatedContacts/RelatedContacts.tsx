//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Avatar } from '@dxos/react-ui-card';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { type Person } from '@dxos/types';

import { meta } from '#meta';

export type RelatedContactsProps = {
  contacts: Person.Person[];
  onContactClick?: (contact: Person.Person) => void;
};

export const RelatedContacts = ({ contacts, onContactClick }: RelatedContactsProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (!contacts.length) {
    return null;
  }

  return (
    <Card.Section title={t('related-contacts.title')}>
      {contacts.map((contact) => (
        <Card.Row
          key={contact.id}
          // The avatar, not a generic glyph: a row standing for a person reads the same here as it does
          // in every message and attendee row. Non-interactive, since the row is itself a button.
          leading={<Avatar actor={{ name: contact.fullName, email: contact.emails?.[0]?.value }} size={5} />}
          trailing={<Icon.Icon icon='ph--arrow-right--regular' />}
          onClick={() => onContactClick?.(contact)}
        >
          <Card.Text>{contact.fullName || contact.emails?.[0]?.value || contact.id}</Card.Text>
        </Card.Row>
      ))}
    </Card.Section>
  );
};
