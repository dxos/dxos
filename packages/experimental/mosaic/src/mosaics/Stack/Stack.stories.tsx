//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { range } from '@dxos/util';

import { createItem } from '../../testing';
import { Stack, StackTile } from './Stack';

faker.seed(100);

const num = 12;

const Test = () => {
  const [tiles] = useState<StackTile[]>(() => {
    return range(num).map(() => {
      return createItem();
    });
  });

  return <Stack tiles={tiles} />;
};

export default {
  component: Stack,
  decorators: [
    (Story: any) => (
      <div className='w-[500px] mli-auto bg-neutral-50'>
        <Story />
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <Test />
};
