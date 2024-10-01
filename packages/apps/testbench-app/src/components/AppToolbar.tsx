//
// Copyright 2024 DXOS.org
//

import { Bug, Hammer, User } from '@phosphor-icons/react';
import React from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { Button } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type AppToolbarProps = {
  onHome: () => void;
  onProfile: () => void;
  onDevtools?: () => void;
};

export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps) => {
  const identity = useIdentity();
  if (!identity) {
    return null;
  }

  return (
    <div className='flex shrink-0 items-center p-1'>
      <Button variant='ghost' classNames='!px-[5px] text-primary-500' onClick={onHome}>
        <Bug className={getSize(6)} />
      </Button>
      <Button variant='ghost' classNames='!px-[5px] text-primary-500' onClick={onDevtools}>
        <Hammer className={getSize(6)} />
      </Button>
      <div className='grow' />
      <div className='flex gap-2 items-center'>
        <div className='font-mono'>{identity?.identityKey.truncate()}</div>
        <Button classNames='!px-[7px]' onClick={onProfile}>
          <User className={getSize(5)} />
        </Button>
      </div>
    </div>
  );
};
