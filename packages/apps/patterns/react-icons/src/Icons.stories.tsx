//
// Copyright 2022 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { DXNS, DXOS, ECHO, HALO, KUBE, MESH } from './icons';

const Icon = () => null;

export default {
  component: Icon
};

export const Default = {
  render: () => {
    return (
      <div className='absolute flex w-full h-full items-center justify-center'>
        <div className='grid grid-cols-3 gap-16'>
          <DXNS className='w-[256px] h-[256px] fill-orange-700' />
          <DXOS className='w-[256px] h-[256px] fill-teal-700' />
          <ECHO className='w-[256px] h-[256px] fill-violet-700' />
          <HALO className='w-[256px] h-[256px] fill-purple-700' />
          <KUBE className='w-[256px] h-[256px] fill-sky-700' />
          <MESH className='w-[256px] h-[256px] fill-green-700' />
        </div>
      </div>
    );
  }
};
