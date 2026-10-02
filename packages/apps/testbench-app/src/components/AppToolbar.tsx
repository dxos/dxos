//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { toPublicKey } from '@dxos/protocols/buf';
import { useIdentity } from '@dxos/react-client/halo';
import * as IconButton from '@dxos/react-ui/IconButton';

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
      <IconButton.Root
        classNames='px-[5px] text-primary-500'
        icon='ph--bug--regular'
        iconOnly
        label='Home'
        onClick={onHome}
        variant='ghost'
      />
      <IconButton.Root
        classNames='px-[5px] text-primary-500'
        icon='ph--toolbox--regular'
        iconOnly
        label='Developer tools'
        onClick={onDevtools}
        variant='ghost'
      />
      <div className='grow' />
      <div className='flex gap-2 items-center'>
        <div className='font-mono'>{toPublicKey(identity?.identityKey)?.truncate()}</div>
        <IconButton.Root classNames='px-[7px]' icon='ph--user--regular' iconOnly label='Profile' onClick={onProfile} />
      </div>
    </div>
  );
};
