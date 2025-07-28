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
        icon='ph--bug--regular'
        variant='ghost'
        classNames='pli-[5px] text-primary-500'
        onClick={onHome}
        iconOnly
        size={6}
        label='Home'
      />
      <IconButton
        icon='ph--hammer--regular'
        variant='ghost'
        classNames='pli-[5px] text-primary-500'
        onClick={onDevtools}
        iconOnly
        size={6}
        label='Developer tools'
      />
      <div className='grow' />
      <div className='flex gap-2 items-center'>
        <div className='font-mono'>{identity?.identityKey.truncate()}</div>
        <IconButton
          icon='ph--user--regular'
          classNames='pli-[7px]'
          onClick={onProfile}
          iconOnly
          size={5}
          label='Profile'
        />
      </div>
    </div>
  );
};
