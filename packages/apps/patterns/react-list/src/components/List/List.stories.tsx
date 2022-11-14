//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React, { useState } from 'react';

import { defaultConfig, Item } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient } from '@dxos/react-client';
import { Loading } from '@dxos/react-uikit';

import { LIST_TYPE } from '../../model';
import { templateForComponent } from '../../testing';
import { List, ListProps } from './List';

export default {
  title: 'react-list/List',
  component: List,
  argTypes: {}
};

const Template = (args: Omit<ListProps, 'item'>) => {
  const client = useClient();
  const [item, setItem] = useState<Item<ObjectModel>>();

  useAsyncEffect(async () => {
    // TODO(burdon): Observer.
    await client.halo.createProfile();
    // TODO(burdon): Observer.
    const space = await client.echo.createSpace();
    const item = await space.database.createItem({
      model: ObjectModel,
      type: LIST_TYPE
    });
    setItem(item);
  }, []);

  return <main>{item ? <List {...args} item={item} /> : <Loading label='Loading…' />}</main>;
};

export const Default = templateForComponent(Template)({});
Default.args = {};
Default.decorators = [
  // TODO(wittjosiah): Factor out.
  (Story) => (
    <ClientProvider config={defaultConfig}>
      <Story />
    </ClientProvider>
  )
];
