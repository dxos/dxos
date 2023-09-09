//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import React from 'react';

import '@dxosTheme';

import { Card } from './Card';

faker.seed(1234);

export default {
  component: Card,
  args: {},
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex flex-col w-[360px] h-full my-8'>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Default = {
  args: {
    id: '1',
    title: 'Hello World',
    sections: [
      {
        text: faker.lorem.sentences(),
      },
      {
        text: faker.lorem.sentences(),
      },
    ],
  },
};
