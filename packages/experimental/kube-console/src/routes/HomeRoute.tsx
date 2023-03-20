//
// Copyright 2023 DXOS.org
//

import React from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Icon from '@dxos/assets/assets/icons/white/icon-dxos.svg';

import { Kube } from '../components';

export const HomeRoute = () => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-zinc-900'>
      <div className='flex flex-1'>
        <Kube />
      </div>
      <div className='flex flex-col shrink-0 h-[180px] select-none' style={{ fontFamily: 'Sharp Sans' }}>
        <div className='flex justify-center items-center text-white font-light opacity-60'>
          <img src={Icon} className='w-[80px] h-[80px]' />
          <span className='ml-4 text-[60px]'>DXOS</span>
        </div>
        <div className='flex justify-center items-center text-zinc-500 font-light'>
          <span className='mt-4 text-2xl'>KUBE Console</span>
        </div>
      </div>
    </div>
  );
};
