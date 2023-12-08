//
// Copyright 2023 DXOS.org
//

import { AddressBook, type IconProps } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const CONTACTS_PLUGIN = 'dxos.org/plugin/contacts';

export default pluginMeta({
  id: CONTACTS_PLUGIN,
  name: 'Contacts',
  tags: ['experimental'],
  iconComponent: (props: IconProps) => <AddressBook {...props} />,
});
