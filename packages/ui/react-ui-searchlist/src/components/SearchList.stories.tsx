//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { SearchList } from './SearchList';

type StoryItems = Record<string, string>;

const defaultItems: StoryItems = faker.helpers
  .uniqueArray(faker.commerce.productName, 16)
  .sort()
  .reduce((acc: StoryItems, label) => {
    acc[faker.string.uuid()] = label;
    return acc;
  }, {});

const SearchListStory: FC<{ items: StoryItems }> = ({ items = defaultItems }) => {
  return (
    <SearchList.Root filter={(value, search) => (items[value].includes(search) ? 1 : 0)}>
      <SearchList.Input placeholder='Search...' />
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
  title: 'react-ui-searchlist/SearchList',
  component: SearchListStory,
  decorators: [withTheme],
};

export const Default = {
  args: {},
};
