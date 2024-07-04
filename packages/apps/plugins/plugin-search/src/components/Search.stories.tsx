//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { type FC, useState } from 'react';

import { faker } from '@dxos/random';
import { FullscreenDecorator } from '@dxos/react-client/testing';
import { DensityProvider } from '@dxos/react-ui';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { SearchContextProvider, useGlobalSearch, useGlobalSearchResults } from '../context';

faker.seed(1);

const Story: FC<{ objects: any[] }> = ({ objects }) => {
  const [selected, setSelected] = useState<string>();
  const { setMatch } = useGlobalSearch();
  const filteredItems = useGlobalSearchResults(objects);

  return (
    <DensityProvider density='fine'>
      <div className='flex grow justify-center overflow-hidden'>
        <div className='flex flex-col w-[300px] m-4 overflow-hidden'>
          <Searchbar variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} />
          <SearchResults items={filteredItems} selected={selected} onSelect={setSelected} />
        </div>
      </div>
    </DensityProvider>
  );
};

const SearchContextDecorator = (): DecoratorFunction<ReactRenderer> => {
  return (Story) => (
    <SearchContextProvider>
      <Story />
    </SearchContextProvider>
  );
};

export default {
  title: 'plugin-search/Search',
  component: Searchbar,
  render: Story,
  decorators: [FullscreenDecorator(), SearchContextDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
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
