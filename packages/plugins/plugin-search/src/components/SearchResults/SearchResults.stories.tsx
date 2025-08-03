//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { filterObjectsSync } from '../../hooks';

import { SearchResults, type SearchResultsProps } from './SearchResults';

faker.seed(1);

const DefaultStory = (args: SearchResultsProps) => {
  const [selected, setSelected] = useState<string>();

  return (
    <div className='flex grow justify-center overflow-hidden'>
      <div className='flex w-[300px] m-4 overflow-hidden'>
        <SearchResults {...args} selected={selected} onSelect={setSelected} />
      </div>
    </div>
  );
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

const meta: Meta<typeof SearchResults> = {
  title: 'plugins/plugin-search/SearchResults',
  component: SearchResults,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
