//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React, { FC, PropsWithChildren, useState } from 'react';

import '@dxosTheme';
import { Density } from '@dxos/aurora-types';

import { Select } from './Select';
import { DensityProvider } from '../DensityProvider';

faker.seed(1234);

// TODO(burdon): Factor out density test.
const createDensityTest =
  (Component: FC<any>) =>
  ({ ...props }) => {
    const densities: Density[] = ['coarse', 'fine'];
    return (
      <div className='grid grid-cols-2'>
        {densities.map((density) => (
          <div key={density}>
            <DensityProvider density={density}>
              <Component {...props} />
            </DensityProvider>
          </div>
        ))}
      </div>
    );
  };

type ItemProps = { id: string; text: string };

const StorybookSelect = ({ items = [] }: PropsWithChildren<{ items: ItemProps[] }>) => {
  const [value, setValue] = useState<string>();
  return (
    <Select.Root value={value} onValueChange={setValue}>
      <Select.TriggerButton placeholder='Select value' />
      <Select.Portal>
        <Select.Content>
          <Select.ScrollUpButton />
          <Select.Viewport>
            {items.map(({ id, text }) => (
              <Select.Option key={id} value={id}>
                {text}
              </Select.Option>
            ))}
          </Select.Viewport>
          <Select.ScrollDownButton />
          <Select.Arrow />
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};

export default {
  component: createDensityTest(StorybookSelect),
};

export const Default = {
  args: {
    items: Array.from({ length: 16 }).map((_, i) => ({ id: `item-${i}`, text: faker.lorem.word() })),
  },
};
