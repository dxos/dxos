//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { faker } from '@faker-js/faker';
import React, { useState } from 'react';

import { Popover } from '@dxos/react-ui';

import { SearchList, Combobox } from './SearchList';

faker.seed(1234);

const storybookItems = faker.helpers.uniqueArray(faker.commerce.product, 16);

const ComboboxStory = () => {
  const [open, onOpenChange] = useState(false);
  return (
    <Combobox.Root open={open} onOpenChange={onOpenChange} placeholder='Nothing selected'>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>
          <Combobox.Trigger />
        </Popover.Trigger>
        <SearchList.Root filter={(value, search) => (value.includes(search) ? 1 : 0)}>
          <Popover.Content side='bottom' collisionPadding={48}>
            <SearchList.Input placeholder='Search...' />
            <Popover.Viewport>
              <SearchList.Content>
                {storybookItems.map((value) => (
                  <SearchList.Item key={value}>{value}</SearchList.Item>
                ))}
              </SearchList.Content>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </SearchList.Root>
      </Popover.Root>
    </Combobox.Root>
  );
};

export default {
  component: ComboboxStory,
};

export const Default = {
  args: {},
};
