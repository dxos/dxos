//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { PublicKeySelector } from '../components';
import { useDevtoolsDispatch, useDevtoolsState } from '../hooks';

export const SpaceSelector = () => {
  const spaces = useSpaces();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceKey?: PublicKey) => {
    setState((state) => ({
      ...state,
      space: spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined
    }));
  };

  return (
    <PublicKeySelector
      keys={spaces.map((space) => space.key)}
      value={space?.key}
      placeholder={'Select space'}
      onSelect={handleSelect}
    />
  );
};

export const SpaceToolbar: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <div className='flex w-full border-b'>
      <div className='w-1/3 p-2'>
        <SpaceSelector />
      </div>
      <div className='w-2/3 p-2 mr-2'>{children}</div>
    </div>
  );
};
