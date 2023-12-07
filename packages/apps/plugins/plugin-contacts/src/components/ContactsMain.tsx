//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { AddressBook as AddressBookType } from '@braneframe/types';
import { getSpaceForObject, useQuery } from '@dxos/react-client/echo';
import { Main } from '@dxos/react-ui';
import { baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart, mx } from '@dxos/react-ui-theme';

export type ContactsMainProps = {
  contacts: AddressBookType;
};

export const ContactsMain = ({ contacts }: ContactsMainProps) => {
  const space = getSpaceForObject(contacts);
  const { objects = [] } = useQuery(space, AddressBookType.filter());

  return (
    <Main.Content classNames={[baseSurface, fixedInsetFlexLayout, topbarBlockPaddingStart]}>
      <div className={mx('flex flex-grow')}>
        {objects.map((object) => (
          <div key={object.id}>
            <div>{object.name}</div>
          </div>
        ))}
      </div>
    </Main.Content>
  );
};
