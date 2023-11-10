//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC } from 'react';

import { Searchmenu } from './Searchmenu';

type StoryItems = Record<string, string>;

const defaultItems: StoryItems = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .reduce((acc: StoryItems, label) => {
    acc[faker.string.uuid()] = label;
    return acc;
  }, {});

const SearchmenuStory: FC<{ items: StoryItems }> = ({ items = defaultItems }) => {
  return (
    <Searchmenu.Root
      filter={(value, search) => (items[value].toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
      classNames='flex flex-col w-full bg-neutral-100 dark:bg-neutral-800'
    >
      <Searchmenu.Input placeholder='Select...' />
      <Searchmenu.List>
        {Object.entries(items).map(([value, label]) => (
          <Searchmenu.Item key={value} value={value}>
            {label}
          </Searchmenu.Item>
        ))}
      </Searchmenu.List>
    </Searchmenu.Root>
  );
};

export default {
  component: SearchmenuStory,
};

// TODO(burdon): Test controlled and uncontrolled.

export const Default = {
  args: {},
};
