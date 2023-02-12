//
// Copyright 2022 DXOS.org
//

import { Bug, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

// TODO(burdon): Menu component.
export const Menu = () => {
  return (
    <div className='flex shrink-0 items-center'>
      <Link className='pl-2' to='/identity' title='Identity'>
        <User className={getSize(6)} />
      </Link>
    </div>
  );
};

// TODO(burdon): Show search box or Space name in title.
export const AppBar = () => {
  return (
    <div className='flex items-center justify-between fixed px-5 inline-start-0 inline-end-0 block-start-0 bs-appbar bg-appbar-header z-[1]'>
      <div className='flex items-center'>
        <Bug className={mx('logo', getSize(8))} data-testid='kai-bug' />
      </div>

      <Menu />
    </div>
  );
};
