//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { CircleNotch } from '@phosphor-icons/react';
import { type Icon } from '@phosphor-icons/react';
import React from 'react';

import { mx } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

const Icon = () => null;

export default {
  title: 'react-icons/Logo',
  component: Icon,
  decorators: [withTheme],
};

export const Default = {
  render: () => {
    return (
      <div className='absolute flex w-full h-full items-center justify-center text-blue-700'>
        <div className='absolute'>
          <CircleNotch
            weight='bold'
            className={mx(
              'animate-spin-logo-3',
              'w-[240px] h-[240px] [&>path]:fill-neutral-300 [&>path]:stroke-neutral-500 [&>path]:stroke-[2px]',
            )}
            style={{ filter: 'blur(0.6rem)' }}
          />
        </div>
        <div className='absolute'>
          <CircleNotch
            weight='bold'
            className={mx(
              'animate-spin-logo-2',
              'w-[160px] h-[160px] [&>path]:fill-green-200 [&>path]:stroke-neutral-500 [&>path]:stroke-[2px]',
            )}
            style={{ animationDirection: 'reverse', filter: 'blur(0.3rem)' }}
          />
        </div>
        <div className='absolute'>
          <CircleNotch
            weight='bold'
            className={mx(
              'animate-spin-logo-1',
              'w-[80px] h-[80px] [&>path]:fill-blue-300 [&>path]:stroke-neutral-500 [&>path]:stroke-[2px]',
            )}
            style={{ filter: 'blur(0.3rem)' }}
          />
        </div>
        {/* <div className='absolute'> */}
        {/*  <CircleNotch */}
        {/*    weight='bold' */}
        {/*    className={mx( */}
        {/*      'animate-spin-logo-3', */}
        {/*      'w-[40px] h-[40px] [&>path]:fill-neutral-300 [&>path]:stroke-neutral-500 [&>path]:stroke-[2px]', */}
        {/*    )} */}
        {/*    style={{ animationDirection: 'reverse' }} */}
        {/*  /> */}
        {/* </div> */}
        <div className='mt-[400px] text-[100px] font-[k2d] italic text-neutral-500'>composer</div>
      </div>
    );
  },
};

// stroke-width: 20px;
// stroke-linecap: butt;
// stroke-linejoin: bevel;
// fill: red;
// stroke: red;
// fill: none;
