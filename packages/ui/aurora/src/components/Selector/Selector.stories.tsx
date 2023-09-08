//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { useEffect, useState } from 'react';

import '@dxosTheme';

import { Selector } from './Selector';

type Value = { id: string; text: string };

const values: Value[] = faker.helpers
  .uniqueArray(faker.definitions.animal.fish, 100)
  .sort()
  .map((text) => ({
    id: faker.string.uuid(),
    text,
  }));

export default {
  component: Selector,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex w-80 m-8 bg-white'>
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
    onChange: (value: any) => console.log('onChange', value),
    values,
  },
};

export const Empty = {
  args: {},
};

export const TypeAhead = () => {
  const [text, setText] = useState<string>();
  const [selected, setSelected] = useState<Value>();
  const [matching, setMatching] = useState<Value[]>();
  useEffect(() => {
    console.log({ text });
    setMatching(
      text?.length ? values.filter((value) => value.text?.length && value.text?.toLowerCase().includes(text)) : [],
    );
  }, [text]);

  return (
    <div className='flex flex-col w-full'>
      <div className='ring'>
        <Selector<Value>
          placeholder={'Select...'}
          values={matching}
          value={selected}
          adapter={(value) => value}
          onChange={setSelected}
          onInputChange={(text) => setText(text?.toLowerCase())}
        />
      </div>

      <div className='mt-16 p-2 font-mono text-xs truncate'>{selected?.id ?? 'NULL'}</div>
    </div>
  );
};
