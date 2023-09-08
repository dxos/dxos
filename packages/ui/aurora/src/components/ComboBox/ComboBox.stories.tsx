//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import '@dxosTheme';

import { ComboBox } from './ComboBox';

type Item = { id: string; text: string };

const items: Item[] = faker.helpers
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
    onChange: (item: any) => console.log('onChange', item),
    items,
  },
};

export const Empty = {
  args: {},
};

export const TypeAhead = () => {
  const [text, setText] = useState<string>();
  const [selected, setSelected] = useState<Item>();
  const [matching, setMatching] = useState<Item[]>();
  useEffect(() => {
    console.log({ text });
    setMatching(
      text?.length ? items.filter((item) => item.text?.length && item.text?.toLowerCase().includes(text)) : [],
    );
  }, [text]);

  return (
    <div className='flex flex-col w-full bg-neutral-100 dark:bg-neutral-800'>
      <ComboBox.Root<Item>
        placeholder={'Select...'}
        items={matching}
        value={selected}
        adapter={(item) => ({ id: item.id, text: item.text })}
        onChange={setSelected}
        onInputChange={(text) => setText(text?.toLowerCase())}
      />

      <div className='mt-16 p-2 font-mono text-xs truncate'>{selected?.id ?? 'NULL'}</div>
    </div>
  );
};
