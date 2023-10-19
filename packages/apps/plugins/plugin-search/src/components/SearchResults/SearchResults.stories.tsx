//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC, useState } from 'react';

import { DensityProvider } from '@dxos/aurora';

import { SearchResults, type SearchResultsProps } from './SearchResults';
import { FullscreenDecorator } from '../util';

faker.seed(1);

const Story: FC<SearchResultsProps> = (args) => {
  const [selected, setSelected] = useState<string>();

  return (
    <DensityProvider density='fine'>
      <div className='flex grow justify-center overflow-hidden'>
        <div className='flex w-[300px] m-4 overflow-hidden'>
          <SearchResults {...args} selected={selected} onSelect={setSelected} />
        </div>
      </div>
    </DensityProvider>
  );
};

export default {
  component: SearchResults,
  render: Story,
  decorators: [FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

const line = 'Snippet for the first item in the results.';
export const Default = {
  args: {
    items: Array.from({ length: 40 }).map((_, i) => ({
      id: faker.string.uuid(),
      label: faker.lorem.sentence(4),
      snippet: i === 0 ? line : faker.lorem.sentences(2),
    })),
    match: new RegExp(line.split(' ')[3].slice(0, 4), 'i'),
  },
};
