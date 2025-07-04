//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type Decorator, type StoryFn } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { SearchResults } from './SearchResults';
import { Searchbar, type SearchbarProps } from './Searchbar';
import { SearchContextProvider, useGlobalSearch, useGlobalSearchResults } from '../hooks';

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

const SearchContextDecorator = (): Decorator => {
  return (Story: StoryFn) => (
    <SearchContextProvider>
      <Story />
    </SearchContextProvider>
  );
};

export const Default = {
  args: {
    objects: Array.from({ length: 8 }).map(() => ({
      id: faker.string.uuid(),
      label: faker.lorem.sentence(4).replace(/\./g, ''),
      content: faker.lorem.sentences(3),
    })),
  },
};

const meta: Meta<typeof Searchbar> = {
  title: 'plugins/plugin-search/Search',
  component: Searchbar,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true }), SearchContextDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
