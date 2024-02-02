//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { type FC, type PropsWithChildren, useState } from 'react';

import { faker } from '@dxos/random';
import { type Density } from '@dxos/react-ui-types';

import { Select } from './Select';
import { withTheme } from '../../testing';
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
  title: 'react-ui/Select',
  component: createDensityTest(StorybookSelect),
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    items: Array.from({ length: 16 }).map((_, i) => ({ id: `item-${i}`, text: faker.lorem.word() })),
  },
};
