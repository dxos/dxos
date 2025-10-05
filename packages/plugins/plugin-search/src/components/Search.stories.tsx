//
// Copyright 2023 DXOS.org
//

import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { SearchContextProvider, useGlobalSearch, useGlobalSearchResults } from '../hooks';

import { Searchbar, type SearchbarProps } from './Searchbar';
import { SearchResults } from './SearchResults';

faker.seed(1);

type StoryProps = SearchbarProps & {
  objects?: any[];
};

const DefaultStory = ({ objects, ...props }: StoryProps) => {
  const [selected, setSelected] = useState<string>();
  const { setMatch } = useGlobalSearch();
  const filteredItems = useGlobalSearchResults(objects);

  return (
    <div className='flex grow justify-center overflow-hidden'>
      <div className='flex flex-col w-[300px] m-4 overflow-hidden'>
        <Searchbar variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} {...props} />
        <SearchResults items={filteredItems} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  );
};

const withSearchContext = (): Decorator => {
  return (Story) => (
    <SearchContextProvider>
      <Story />
    </SearchContextProvider>
  );
};

export const Default: Story = {
  args: {
    objects: Array.from({ length: 8 }).map(() => ({
      id: faker.string.uuid(),
      label: faker.lorem.sentence(4).replace(/\./g, ''),
      content: faker.lorem.sentences(3),
    })),
  },
};

const meta = {
  title: 'plugins/plugin-search/Search',
  component: Searchbar,
  render: DefaultStory,
  decorators: [withTheme, withSearchContext()],
  parameters: {
    layout: 'column',
  },
} satisfies Meta<typeof Searchbar>;

export default meta;

type Story = StoryObj<typeof meta>;
