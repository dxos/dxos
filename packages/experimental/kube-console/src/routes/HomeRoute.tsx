//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Kube } from '../components';

export const HomeRoute = () => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-zinc-900'>
      <div className='flex flex-1'>
        <Kube />
      </div>
      <div className='flex flex-col shrink-0 h-[160px]'>
        <div className='flex justify-center'>
          <div className='text-[60px] text-zinc-400 font-light' style={{ fontFamily: 'Sharp Sans' }}>
            DXOS
          </div>
        </div>
      </div>
    </div>
  );
};
