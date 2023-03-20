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
      <div className='flex flex-col shrink-0 h-[160px]'>
        <div className='flex justify-center'>
          <div className='flex items-center text-[60px] text-zinc-400 font-light' style={{ fontFamily: 'Sharp Sans' }}>
            <img src={Icon} className='w-[80px] h-[80px] opacity-50' />
            <span className='ml-4'>DXOS</span>
          </div>
        </div>
      </div>
    </div>
  );
};
