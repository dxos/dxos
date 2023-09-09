//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import '@dxosTheme';
import { ComboBox, ComboBoxItem } from './ComboBox';

type Item = { id: string; text: string };

const data: Item[] = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .map((text) => ({
    id: faker.string.uuid(),
    text,
  }));

export default {
  component: ComboBox.Root,
  args: {
    adapter: (item: Item) => ({ id: item.id, text: item.text }),
  },
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

export const Default = {
  args: {
    placeholder: 'Select...',
    items: data,
    onChange: (item: any) => console.log('onChange', item),
  },
};

export const Empty = {
  args: {},
};

// TODO(burdon): Test controlled and uncontrolled.

export const ComboBoxStory = () => {
  const [text, setText] = useState<string>();
  const [items, setItems] = useState<ComboBoxItem[]>([]);
  const [selected, setSelected] = useState<ComboBoxItem>();
  useEffect(() => {
    setItems(() => {
      if (!text?.length) {
        return [];
      }

      const matching = data.filter((item) => item.text?.length && item.text?.toLowerCase().includes(text));
      return matching.map((item) => ({ id: item.id, label: item.text, data: item }));
    });
  }, [text]);

  return (
    <div className='flex flex-col w-full bg-neutral-100 dark:bg-neutral-800'>
      <ComboBox.Root
        items={items}
        // value={selected}
        onChange={setSelected}
        onInputChange={(text) => setText(text?.toLowerCase())}
      >
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
