//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type AddressBook as AddressBookType, Contact as ContactType } from '@braneframe/types';
import { getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

import { ContactList } from './ContactList';
import { MasterDetail } from './MasterDetail';

// TODO(burdon): Master detail (same as Inbox); incl. selection, cursor navigation, scrolling.
// TODO(burdon): Nav from inbox.
// TODO(burdon): Show messages for selection.

// TODO(burdon): Create outliner task list re selection.

// TODO(burdon): Select/merge.
// TODO(burdon): Click to research, get image, etc. Scrape LinkedIn?
// TODO(burdon): Tags.

// TODO(burdon): Factor out.
export const styles = {
  selected: '!bg-primary-100 dark:!bg-primary-700',
  columnWidth: 'max-w-[400px]',
};

const byName =
  (direction = 1) =>
  ({ name: _a }: ContactType, { name: _b }: ContactType) => {
    const a = _a?.toLowerCase().replace(/\W/g, '');
    const b = _b?.toLowerCase().replace(/\W/g, '');
    return a === undefined || a < b ? -direction : b === undefined || a > b ? direction : 0;
  };

export type ContactsMainProps = {
  contacts: AddressBookType;
};

export const ContactsMain = ({ contacts }: ContactsMainProps) => {
  const [selected, setSelected] = useState<ContactType>();
  const space = getSpaceForObject(contacts);
  const objects = useQuery(space, ContactType.filter());
  objects.sort(byName());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <MasterDetail>
        <ContactList contacts={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </Main.Content>
  );
};
