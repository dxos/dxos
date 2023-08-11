//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { PropsWithChildren, useState } from 'react';

import '@dxosTheme';

import { Select } from './Select';

faker.seed(1234);

type ItemProps = { id: string; text: string };

const StorybookSelect = ({ items = [] }: PropsWithChildren<{ items: ItemProps[] }>) => {
  const [value, setValue] = useState<string>();
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.Trigger placeholder={'Select value...'} />
      <Select.Content>
        {items.map(({ id, text }) => (
          <Select.Item key={id} value={id}>
            {text}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};

export default {
  component: StorybookSelect,
};

export const Default = {
  args: {
    items: Array.from({ length: 8 }).map((_, i) => ({ id: `item-${i}`, text: faker.lorem.word() })),
  },
};
