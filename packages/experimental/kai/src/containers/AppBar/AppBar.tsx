//
// Copyright 2022 DXOS.org
//

import { Command, Info, User } from 'phosphor-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { ShellLayout, withReactor } from '@dxos/react-client';
import { Button, DensityProvider, DropdownMenu, getSize, mx } from '@dxos/react-components';
import { useShell } from '@dxos/react-ui';

import { SpaceSettingsDialog } from '../../containers';
import { getIcon, useAppRouter, useTheme } from '../../hooks';
import { Actions } from './Actions';

// TODO(burdon): Show search box or Space name in title.
export const AppBar = withReactor(() => {
  const theme = useTheme();
  const { space } = useAppRouter();
  const shell = useShell();
  const [showSettings, setShowSettings] = useState(false);
  const Icon = getIcon(space?.properties.icon);

  // 'transition-[rotate] duration-500 transition -rotate-45 hover:rotate-180'

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
      <div className='flex items-center'>
        <Link to='/'>
          <Icon className={getSize(8)} data-testid='space-icon' />
        </Link>
      </div>

      {space && (
        <div className='flex overflow-hidden mx-6 items-center'>
          <h2 className='overflow-hidden whitespace-nowrap text-ellipsis text-xl'>
            {space.properties?.name ?? 'Space'}
          </h2>
          <Button variant='ghost' onClick={() => setShowSettings(true)}>
            <Info weight='bold' className={getSize(4)} />
          </Button>
        </div>
      )}

      <div className='flex-1' />

      {/* TODO(burdon): Help button. */}
      {/* TODO(burdon): Share button. */}
      <div className='flex items-center'>
        <DensityProvider density='coarse'>
          <DropdownMenu
            trigger={
              <Button variant='ghost' className='p-2'>
                <Command className={getSize(6)} />
              </Button>
            }
            slots={{ content: { className: 'z-50' } }}
          >
            <Actions />
          </DropdownMenu>
          <Button variant='ghost' className='p-2' onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>
            <User className={getSize(6)} />
          </Button>
        </DensityProvider>
      </div>

      {space && <SpaceSettingsDialog space={space} open={showSettings} onOpenChange={setShowSettings} />}
    </div>
  );
});
