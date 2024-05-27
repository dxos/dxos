//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type AddressBookType, ContactType } from '@braneframe/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  fixedInsetFlexLayout,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { ContactList } from './ContactList';
import { MasterDetail } from '../MasterDetail';

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
    return a === undefined || b === undefined || a < b ? -direction : b === undefined || a > b ? direction : 0;
  };

export type ContactsMainProps = {
  contacts: AddressBookType;
};

const ContactsMain = ({ contacts }: ContactsMainProps) => {
  const [selected, setSelected] = useState<ContactType>();
  const space = getSpace(contacts);
  const objects = useQuery(space, Filter.schema(ContactType));
  objects.sort(byName());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <MasterDetail>
        <ContactList contacts={objects} selected={selected?.id} onSelect={setSelected} />
      </MasterDetail>
    </Main.Content>
  );
};

export default ContactsMain;
