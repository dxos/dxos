//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import React, { FC, useEffect, useState } from 'react';

import { ComboBox, ComboBoxItem } from './ComboBox';

type TestItem = { id: string; text: string };

const data: TestItem[] = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .map((text) => ({
    id: faker.string.uuid(),
    text,
  }));

const ComboBoxStory: FC<{ data: TestItem[] }> = ({ data = [] }) => {
  const [filter, setFilter] = useState<string>();
  const [items, setItems] = useState<ComboBoxItem[]>([]);
  const [selected, setSelected] = useState<ComboBoxItem>();
  useEffect(() => {
    setItems(() =>
      filter?.length
        ? data
            .filter((item) => item.text?.length && item.text?.toLowerCase().includes(filter.toLowerCase()))
            .map((item) => ({ id: item.id, label: item.text, data: item }))
        : [],
    );
  }, [filter]);

  return (
    <div className='flex flex-col w-full bg-neutral-100 dark:bg-neutral-800'>
      <ComboBox.Root items={items} onChange={setSelected} onInputChange={setFilter}>
        <ComboBox.Input placeholder={'Select...'} />
        <ComboBox.Content>
          {items?.map((item) => (
            <ComboBox.Item key={item.id} item={item}>
              {item.label}
            </ComboBox.Item>
          ))}
        </ComboBox.Content>
      </ComboBox.Root>

      <div className='mt-16 p-2 font-mono text-xs truncate'>
        <div>{selected?.label}</div>
      </div>
    </div>
  );
};

export default {
  component: ComboBoxStory,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex w-60 m-8 bg-white'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

// TODO(burdon): Test controlled and uncontrolled.

export const Default = {
  args: {
    data,
  },
};

export const Empty = {
  args: {},
};
