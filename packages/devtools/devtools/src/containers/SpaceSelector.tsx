//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { PublicKeySelector } from '../components';
import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks';
import { Planet } from '@phosphor-icons/react';

export const SpaceSelector = () => {
  const spaces = useSpaces({ all: true });
  const spacesInfo = useSpacesInfo();
  const { space } = useDevtoolsState();
  const setState = useDevtoolsDispatch();

  const handleSelect = (spaceKey?: PublicKey) => {
    setState((state) => ({
      ...state,
      space: spaceKey ? spaces.find((space) => space.key.equals(spaceKey)) : undefined,
      spaceInfo: spaceKey ? spacesInfo.find((spaceInfo) => spaceInfo.key.equals(spaceKey)) : undefined,
      feedKey: undefined
    }));
  };

  console.log(spaces)

  return (
    <PublicKeySelector
      keys={spaces.map((space) => space.key)}
      Icon={Planet}
      defaultValue={space?.key}
      placeholder={'Select space'}
      onChange={handleSelect}
    />
  );
};

export const SpaceToolbar: FC<{ children?: ReactNode }> = ({ children }) => {
  return (
    <div className='flex w-full border-b'>
      <div className='flex-shrink w-[400px] p-2'>
        <SpaceSelector />
      </div>
      <div className='flex-1 p-2 mr-2'>{children}</div>
    </div>
  );
};
