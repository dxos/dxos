//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { IconButton } from '@dxos/react-ui';

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
      <IconButton
        classNames='pli-[5px] text-primary-500'
        icon='ph--bug--regular'
        iconOnly
        label='Home'
        onClick={onHome}
        size={6}
        variant='ghost'
      />
      <IconButton
        classNames='pli-[5px] text-primary-500'
        icon='ph--hammer--regular'
        iconOnly
        label='Developer tools'
        onClick={onDevtools}
        size={6}
        variant='ghost'
      />
      <div className='grow' />
      <div className='flex gap-2 items-center'>
        <div className='font-mono'>{identity?.identityKey.truncate()}</div>
        <IconButton classNames='pli-[7px]' icon='ph--user--regular' iconOnly label='Profile' onClick={onProfile} />
      </div>
    </div>
  );
};
