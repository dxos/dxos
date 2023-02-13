//
// Copyright 2022 DXOS.org
//

import { Bug, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { useSpace } from '../../hooks';

// TODO(burdon): Show search box or Space name in title.
export const AppBar = () => {
  const space = useSpace();

  // TODO(burdon): Get title.
  // console.log(':::::::::::::', space.experimental.db);

  return (
    <div
      className={mx(
        'flex justify-between items-center px-5',
        'fixed inline-start-0 inline-end-0 block-start-0 z-[1]',
        'bs-appbar bg-appbar-header'
      )}
    >
      <div className='flex items-center'>
        <Bug className={mx('logo', getSize(8))} data-testid='kai-bug' />
      </div>
      {space && (
        <div className='flex overflow-hidden mx-6'>
          <h2 className='overflow-hidden whitespace-nowrap text-ellipsis text-xl'>{humanize(space.key)}</h2>
        </div>
      )}

      <div className='flex-1' />

      {/* TODO(burdon): Help button. */}
      {/* TODO(burdon): Share button. */}
      <div className='flex items-center'>
        <Link className='pl-2' to='/identity' title='Identity'>
          <User className={getSize(6)} />
        </Link>
      </div>
    </div>
  );
};
