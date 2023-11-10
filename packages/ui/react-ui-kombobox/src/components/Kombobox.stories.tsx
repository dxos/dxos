//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { type FC } from 'react';

import { Kombobox } from './Kombobox';

type StoryItems = Record<string, string>;

const defaultItems: StoryItems = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .reduce((acc: StoryItems, label) => {
    acc[faker.string.uuid()] = label;
    return acc;
  }, {});

const KomboboxStory: FC<{ items: StoryItems }> = ({ items = defaultItems }) => {
  return (
    <Kombobox.Root
      filter={(value, search) => (items[value].toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
      classNames='flex flex-col w-full bg-neutral-100 dark:bg-neutral-800'
    >
      <Kombobox.Input placeholder='Select...' />
      <Kombobox.List>
        {Object.entries(items).map(([value, label]) => (
          <Kombobox.Item key={value} value={value}>
            {label}
          </Kombobox.Item>
        ))}
      </Kombobox.List>
    </Kombobox.Root>
  );
};

export default {
  component: KomboboxStory,
};

// TODO(burdon): Test controlled and uncontrolled.

export const Default = {
  args: {},
};
