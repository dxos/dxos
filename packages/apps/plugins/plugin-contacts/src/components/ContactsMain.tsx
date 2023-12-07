//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AddressBook as AddressBookType } from '@braneframe/types';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedBorder, fixedInsetFlexLayout, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';

export type ContactsMainProps = {
  contacts: AddressBookType;
};

export const ContactsMain = ({ contacts }: ContactsMainProps) => {
  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex grow overflow-hidden border-t', fixedBorder)}>Contacts</div>
    </Main.Content>
  );
};
