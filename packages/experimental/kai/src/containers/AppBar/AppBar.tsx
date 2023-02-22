//
// Copyright 2022 DXOS.org
//

import { Bug, Info, User } from 'phosphor-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { ShellLayout, withReactor } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { SpaceSettingsDialog } from '../../containers';
import { useAppRouter, useShell, useTheme } from '../../hooks';

// TODO(burdon): Show search box or Space name in title.
export const AppBar = withReactor(() => {
  const theme = useTheme();
  const { space } = useAppRouter();
  const shell = useShell();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div
      className={mx(
        'flex justify-between items-center px-4',
        'fixed inline-start-0 inline-end-0 block-start-0 z-[1]',
        'bs-appbar',
        theme.classes?.header,
        theme.panel === 'flat' && 'border-b'
      )}
    >
      <div className='flex items-center' title="Hi I'm Kai!">
        <Link to='/'>
          <Bug
            className={mx(getSize(8), 'transition-[rotate] duration-500 transition -rotate-45 hover:rotate-180')}
            data-testid='kai-bug'
          />
        </Link>
      </div>

      {space && (
        <div className='flex overflow-hidden mx-6 items-center'>
          <h2 className='overflow-hidden whitespace-nowrap text-ellipsis text-xl'>{space.properties?.name}</h2>
          <Button variant='ghost' onClick={() => setShowSettings(true)}>
            <Info className={getSize(4)} />
          </Button>
        </div>
      )}

      <div className='flex-1' />

      {/* TODO(burdon): Help button. */}
      {/* TODO(burdon): Share button. */}
      <div className='flex items-center'>
        <span
          className='pl-2 cursor-pointer'
          onClick={() => shell.setLayout(ShellLayout.DEVICES_LIST, { spaceKey: space?.key })}
          title='Identity'
        >
          <User className={getSize(6)} />
        </span>
      </div>

      {space && <SpaceSettingsDialog space={space} open={showSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
});
