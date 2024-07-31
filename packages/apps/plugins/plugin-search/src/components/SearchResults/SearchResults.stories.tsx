//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, useState } from 'react';

import { faker } from '@dxos/random';
import { DensityProvider } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { SearchResults, type SearchResultsProps } from './SearchResults';
import { filterObjectsSync } from '../../search-sync';

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
  title: 'plugin-search/SearchResults',
  component: SearchResults,
  render: Story,
  decorators: [withTheme, withFullscreen()],
  parameters: {
    layout: 'fullscreen',
  },
};

const word = 'hello';

const objects = Array.from({ length: 100 }).map((_, i) => ({
  id: faker.string.uuid(),
  name: faker.lorem.sentence(4),
  content: faker.lorem.sentence() + ` ${word} ` + faker.lorem.sentence(),
}));

const match = new RegExp(word, 'i');

export const Default = {
  args: {
    items: filterObjectsSync(objects, match),
    match,
  },
};
