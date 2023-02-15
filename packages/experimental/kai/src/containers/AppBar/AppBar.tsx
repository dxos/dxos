//
// Copyright 2022 DXOS.org
//

import { Bug, User } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { useSpace, useTheme } from '../../hooks';

// TODO(burdon): Show search box or Space name in title.
export const AppBar = withReactor(() => {
  const theme = useTheme();
  const space = useSpace();

  return (
    <div
      className={mx(
        'flex justify-between items-center px-4',
        'fixed inline-start-0 inline-end-0 block-start-0 z-[1]',
        'bs-appbar bg-appbar-header',
        theme.panel === 'flat' && 'border-b'
      )}
    >
      <div className='flex items-center' title="Hi I'm Kai!">
        <Bug
          className={mx(getSize(8), 'transition-[rotate] duration-500 transition -rotate-45 hover:rotate-180')}
          data-testid='kai-bug'
        />
      </div>

      {space && (
        <div className='flex overflow-hidden mx-6'>
          <h2 className='overflow-hidden whitespace-nowrap text-ellipsis text-xl'>
            {space.properties.title ?? humanize(space.key)}
          </h2>
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
});
