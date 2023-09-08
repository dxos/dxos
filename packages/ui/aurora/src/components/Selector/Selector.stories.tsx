//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { Selector, SelectorValue } from './Selector';

const values: SelectorValue[] = [{ id: 'apple' }, { id: 'pear' }, { id: 'orange' }, { id: 'grape' }, { id: 'banana' }];

const StorybookSelector = () => {
  return <Selector values={values} placeholder={'Select...'} />;
};

export default {
  component: StorybookSelector,
};

export const Default = {
  args: {},
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className='flex w-[250px] m-8 bg-white'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};
