//
// Copyright 2023 DXOS.org
//

import React from 'react';

import DXOS from '@dxos/assets/assets/icons/white/icon-dxos.svg';

import Brain from '../../assets/images/brain.svg';
import Logo from '../../assets/images/think.svg';

const backgroundColor = '#010331';

const subtitle = 'THINK about what you can do today.';

const Test = () => {
  return (
    <div className='flex flex-1 justify-center items-center' style={{ backgroundColor }}>
      <div className='flex flex-col'>
        <div className='flex justify-center'>
          <img width={400} height={400} src={Brain} />
        </div>
        <div className='flex justify-center py-20'>
          <img width={500} height={200} src={Logo} />
        </div>
        <div className='flex justify-center text-slate-300 text-xl'>{subtitle}</div>
      </div>

      <div className='flex absolute right-4 bottom-4 text-slate-300'>
        <div className='mr-2 pt-[2px]'>Powered by DXOS</div>
        <img width={24} height={24} src={DXOS} />
      </div>
    </div>
  );
};

export default {
  component: Test
};

export const Default = () => {
  // TODO(burdon): Pattern for full screen in storybooks?
  return (
    <div className='flex absolute left-0 right-0 top-0 bottom-0'>
      <Test />
    </div>
  );
};
