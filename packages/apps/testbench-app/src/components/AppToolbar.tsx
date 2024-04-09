//
// Copyright 2024 DXOS.org
//

import { Bug, User } from '@phosphor-icons/react';
import React from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type AppToolbarProps = {
  onHome: () => void;
};

export const AppToolbar = ({ onHome }: AppToolbarProps) => {
  const identity = useIdentity();
  if (!identity) {
    return null;
  }

  return (
    <div className='flex shrink-0 items-center p-1'>
      <Button variant='ghost' onClick={onHome} classNames='!px-[5px] text-primary-500'>
        <Bug className={getSize(6)} />
      </Button>
      <div className='grow' />
      <div className='flex gap-2 items-center'>
        <div>{identity?.identityKey.truncate()}</div>
        <Button disabled classNames='!px-[7px]'>
          <User className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
};
