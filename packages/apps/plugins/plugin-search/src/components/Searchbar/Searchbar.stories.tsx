//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { groupSurface, mx } from '@dxos/aurora-theme';

import { Searchbar } from './Searchbar';

// TODO(burdon): Translation provider for storybook.

export default {
  component: Searchbar,
  args: {},
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full overflow-hidden'>
        <div className={mx('flex flex-col w-[360px] h-full my-8', groupSurface)}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Default = {};
