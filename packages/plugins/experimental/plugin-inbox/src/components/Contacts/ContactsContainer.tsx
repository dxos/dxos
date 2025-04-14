//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { ContactType } from '@dxos/schema';

import { ContactList } from './ContactList';
import { type ContactsType } from '../../types';

// TODO(burdon): Master detail (same as Inbox); incl. selection, cursor navigation, scrolling.
// TODO(burdon): Nav from inbox.
// TODO(burdon): Show messages for selection.

// TODO(burdon): Create outliner task list re selection.

// TODO(burdon): Select/merge.
// TODO(burdon): Click to research, get image, etc. Scrape LinkedIn?
// TODO(burdon): Tags.

const byName =
  (direction = 1) =>
  ({ name: _a }: ContactType, { name: _b }: ContactType) => {
    const a = _a?.toLowerCase().replace(/\W/g, '');
    const b = _b?.toLowerCase().replace(/\W/g, '');
    return a === undefined || b === undefined || a < b ? -direction : a > b ? direction : 0;
  };

export type ContactsContainerProps = {
  contacts: ContactsType;
};

export const ContactsContainer = ({ contacts }: ContactsContainerProps) => {
  const [selected, setSelected] = useState<ContactType>();
  const space = getSpace(contacts);
  const objects = useQuery(space, Filter.schema(ContactType));
  objects.sort(byName());

  return (
    <StackItem.Content toolbar={false}>
      <ContactList contacts={objects} selected={selected?.id} onSelect={setSelected} />
    </StackItem.Content>
  );
};
