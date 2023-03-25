//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { DXOS } from '@dxos/react-icons';

import { Kube } from '../../components';

export const LandingPage = () => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden bg-zinc-900'>
      <div className='flex flex-1 overflow-hidden'>
        <Kube />
      </div>
      <div className='flex flex-col shrink-0 h-[180px] select-none' style={{ fontFamily: 'Sharp Sans' }}>
        <div className='flex justify-center items-center text-white font-light opacity-60'>
          <DXOS className='w-[80px] h-[80px]' />
          <span className='ml-4 text-[60px]'>DXOS</span>
        </div>
        <div className='flex justify-center items-center text-zinc-500 font-light mt-2'>
          <Link to='/module/status'>
            <span className='text-2xl'>KUBE Console</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
