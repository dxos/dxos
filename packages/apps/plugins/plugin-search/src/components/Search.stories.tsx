//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import type { DecoratorFunction } from '@storybook/csf';
import type { ReactRenderer } from '@storybook/react';
import React, { type FC, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';

import { SearchResults } from './SearchResults';
import { Searchbar } from './Searchbar';
import { FullscreenDecorator } from './util';
import { SearchContextProvider, useSearch, useSearchResults } from '../context';

faker.seed(1);

const Story: FC<{ objects: any[] }> = ({ objects }) => {
  const [selected, setSelected] = useState<string>();
  const { setMatch } = useSearch();
  const filteredItems = useSearchResults(objects);

  return (
    <DensityProvider density='fine'>
      <div className='flex grow justify-center overflow-hidden'>
        <div className='flex flex-col w-[300px] m-4 overflow-hidden'>
          <Searchbar className='pl-3' variant='subdued' placeholder='Enter regular expression...' onChange={setMatch} />
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
