//
// Copyright 2020 DXOS.org
//

import React, { FC, ReactNode } from 'react';

import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { useDevtoolsDispatch, useDevtoolsState, useSpacesInfo } from '../hooks';
import { Planet } from '@phosphor-icons/react';
import { Select } from '@dxos/react-appkit';
import { humanize } from '@dxos/util';

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
    <Select
      defaultValue={space?.key?.toHex()}
      placeholder='Select space'
      onValueChange={(id) => handleSelect(PublicKey.fromHex(id))}
    >
      {spaces.map(space => (
        <Select.Item value={space.key.toHex()} key={space.key.toHex()}>
          <div className='flex items-center gap-2'>
            <div className='pr-1'>
              <Planet />
            </div>
            {space.properties.name ?? humanize(space.key)}
            <span className='text-neutral-250'>{space.key.truncate(4)}</span>
          </div>
        </Select.Item>
      ))}
    </Select>
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
