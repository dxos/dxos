//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import MiniSearch from 'minisearch';
import React from 'react';

import '@dxosTheme';

import { groupSurface, mx } from '@dxos/aurora-theme';

import { SearchMain, SearchResult } from './SearchMain';

faker.seed(1234);

type Document = {
  id: string;
  type: string;
  title: string;
  content?: string;
};

const objects = Array.from({ length: 300 })
  .map(() => ({
    id: faker.string.uuid(),
    type: faker.helpers.arrayElement(['document', 'image', 'stack', 'task', 'company']),
    title: faker.commerce.productName() + ' ' + faker.commerce.productName(),
    content: faker.lorem.sentences(),
  }))
  .reduce((map, document) => {
    map.set(document.id, document);
    return map;
  }, new Map<string, Document>());

// https://lucaong.github.io/minisearch/classes/_minisearch_.minisearch.html
const miniSearch = new MiniSearch({
  fields: ['title'],
  storeFields: ['title', 'type'],
});

miniSearch.addAll(Array.from(objects.values()));

const handleSearch = async (text: string): Promise<SearchResult<Document>[]> => {
  const results = miniSearch.search(text, { prefix: true });
  return results.slice(0, 50).map(({ id }) => {
    const document = objects.get(id)!;
    return { id, title: document.title, document };
  });
};

// TODO(burdon): Translation provider.

export default {
  component: SearchMain,
  args: {
    onSearch: handleSearch,
  },
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className={mx('flex flex-col grow w-[360px] overflow-hidden', groupSurface)}>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
