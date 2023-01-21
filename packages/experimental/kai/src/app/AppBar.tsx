//
// Copyright 2022 DXOS.org
//

import { Bug, Globe, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { FrameID } from '../hooks';

export const Menu = () => {
  return (
    <div className='flex items-center'>
      <Link className='p-2' to={FrameID.REGISTRY} title='Registry'>
        <Globe className={getSize(6)} />
      </Link>
      <Link className='p-2' to='/identity' title='Identity'>
        <User className={getSize(6)} />
      </Link>
    </div>
  );
};

export const AppBar = () => {
  return (
    <div className='flex items-center fixed inline-start-0 inline-end-0 block-start-0 bs-appbar bg-orange-400 z-[1] pli-2'>
      <div className='flex items-center p-2'>
        <Bug className={mx('logo', getSize(8))} />
        <div className='ml-1 font-system-semibold'>KAI</div>
      </div>

      <div className='flex-1' />
      <Menu />
    </div>
  );
};
