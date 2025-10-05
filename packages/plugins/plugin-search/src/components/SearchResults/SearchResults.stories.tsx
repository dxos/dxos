//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { faker } from '@dxos/random';

import { filterObjectsSync } from '../../hooks';

import { SearchResults, type SearchResultsProps } from './SearchResults';

faker.seed(1);

const DefaultStory = (props: SearchResultsProps) => {
  const [selected, setSelected] = useState<string>();

  return (
    <div className='flex grow justify-center overflow-hidden'>
      <div className='flex w-[300px] m-4 overflow-hidden'>
        <SearchResults {...props} selected={selected} onSelect={setSelected} />
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

const meta = {
  title: 'plugins/plugin-search/SearchResults',
  component: SearchResults,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SearchResults>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: filterObjectsSync(objects, match),
    match,
  },
};
