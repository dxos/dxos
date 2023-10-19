//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC, useMemo, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';

import { SearchResults, type SearchResultsProps } from './SearchResults';
import { Searchbar } from './Searchbar';
import { FullscreenDecorator } from './util';

faker.seed(1);

const Story: FC<SearchResultsProps> = (args) => {
  const items = useMemo(
    () =>
      Array.from({ length: 40 }).map(() => ({
        id: faker.string.uuid(),
        label: faker.lorem.sentence(4).replace(/\./g, ''),
      })),
    [],
  );

  const [match, setMatch] = useState<RegExp>();
  const [selected, setSelected] = useState<string>();
  const filteredItems = useMemo(() => items.filter((item) => match && item.label.match(match)), [items, match]);

  const handleChange = (text: string) => {
    setMatch(text.length ? new RegExp(text, 'i') : undefined);
  };

  return (
    <DensityProvider density='fine'>
      <div className='flex grow justify-center overflow-hidden'>
        <div className='flex flex-col w-[300px] m-4 overflow-hidden'>
          <Searchbar
            className='pl-3'
            variant='subdued'
            placeholder='Enter regular expression...'
            onChange={handleChange}
          />
          <SearchResults items={filteredItems} selected={selected} onSelect={setSelected} />
        </div>
      </div>
    </DensityProvider>
  );
};

export default {
  component: Searchbar,
  render: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
