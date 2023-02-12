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
    <div
      className={mx(
        'flex items-center justify-between px-5',
        'fixed inline-start-0 inline-end-0 block-start-0 z-[1]',
        'bs-appbar bg-appbar-header'
      )}
    >
      <div className='flex items-center'>
        <Bug className={mx('logo', getSize(8))} data-testid='kai-bug' />
      </div>

      <Menu />
    </div>
  );
};
