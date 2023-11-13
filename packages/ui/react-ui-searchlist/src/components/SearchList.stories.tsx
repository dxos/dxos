//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC } from 'react';

import { SearchList } from './SearchList';

type StoryItems = Record<string, string>;

const defaultItems: StoryItems = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .reduce((acc: StoryItems, label) => {
    acc[faker.string.uuid()] = label;
    return acc;
  }, {});

const SearchListStory: FC<{ items: StoryItems }> = ({ items = defaultItems }) => {
  return (
    <SearchList.Root filter={(value, search) => (items[value].toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
      <SearchList.Input placeholder='Select...' />
      <SearchList.Content>
        {Object.entries(items).map(([value, label]) => (
          <SearchList.Item key={value} value={value} onSelect={(value) => console.log('[item select]', value)}>
            {label}
          </SearchList.Item>
        ))}
      </SearchList.Content>
    </SearchList.Root>
  );
};

export default {
  component: SearchListStory,
};

// TODO(burdon): Test controlled and uncontrolled.

export const Default = {
  args: {},
};
