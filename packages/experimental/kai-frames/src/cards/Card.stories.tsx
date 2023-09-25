//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Card } from '@dxos/mosaic';

const Test = () => {
  return (
    <div className='flex flex-col w-full md:w-[390px] m-4 space-y-8'>
      <Card></Card>
    </div>
  );
};

export default {
  component: Card,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-100'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
