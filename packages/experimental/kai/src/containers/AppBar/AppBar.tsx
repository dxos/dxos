//
// Copyright 2022 DXOS.org
//

import { Command, User } from '@phosphor-icons/react';
import React from 'react';

import { ShellLayout } from '@dxos/react-client';
import { Button, DensityProvider, DropdownMenu, getSize } from '@dxos/react-components';
import { useShell } from '@dxos/react-ui';

import { Actions } from './Actions';

export const AppMenu = () => {
  const shell = useShell();

  return (
    <>
      {/* TODO(burdon): Help button. */}
      {/* TODO(burdon): Share button. */}
      <div className='flex items-center'>
        <DensityProvider density='coarse'>
          <DropdownMenu
            slots={{ content: { className: 'z-50' } }}
            trigger={
              <Button variant='ghost' className='p-2'>
                <Command className={getSize(6)} />
              </Button>
            }
          >
            <Actions />
          </DropdownMenu>
          <Button variant='ghost' className='p-2' onClick={() => shell.setLayout(ShellLayout.DEVICE_INVITATIONS)}>
            <User className={getSize(6)} />
          </Button>
        </DensityProvider>
      </div>
    </>
  );
};
