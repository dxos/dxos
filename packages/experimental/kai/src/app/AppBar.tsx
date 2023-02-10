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
    <div className='flex shrink-0 items-center'>
      <Link className='pl-2' to={FrameID.REGISTRY} title='Registry'>
        <Globe className={getSize(6)} />
      </Link>
      <Link className='pl-2' to='/identity' title='Identity'>
        <User className={getSize(6)} />
      </Link>
    </div>
  );
};

// TODO(burdon): Show Space name in title.
export const AppBar = () => {
  return (
    <div className='flex items-center justify-between fixed px-3 inline-start-0 inline-end-0 block-start-0 bs-appbar bg-appbar-header z-[1]'>
      <div className='flex items-center'>
        <Bug className={mx('logo', getSize(8))} />
      </div>

      <Menu />
    </div>
  );
};
