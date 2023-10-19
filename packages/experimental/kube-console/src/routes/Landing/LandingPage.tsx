//
// Copyright 2023 DXOS.org
//

import { Target } from '@phosphor-icons/react';
import React from 'react';
import { Link } from 'react-router-dom';

import { DXOSHorizontalType } from '@dxos/react-icons';
import { getSize, mx } from '@dxos/react-ui-theme';

import { Kube } from '../../components';

export const LandingPage = () => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-zinc-900'>
      <div className='flex flex-1 overflow-hidden'>
        <Kube />
      </div>

      <div className='flex flex-col shrink-0 h-[200px] m-8 select-none' style={{ fontFamily: 'Sharp Sans' }}>
        <div className='flex justify-center items-center text-white font-light opacity-60'>
          <DXOSHorizontalType className='h-[128px] fill-white' />
        </div>
        <div className='flex justify-center items-center text-zinc-500 font-light'>
          <span className='text-2xl'>KUBE Console</span>
        </div>
      </div>

      <div className='absolute right-4 top-4'>
        <Link to='/module/config'>
          <Target weight='thin' className={mx(getSize(10), 'opacity-30')} />
        </Link>
      </div>
    </div>
  );
};
