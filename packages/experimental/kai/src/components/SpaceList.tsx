//
// Copyright 2022 DXOS.org
//

import { Planet, ShareNetwork } from 'phosphor-react';
import React from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { getSize, mx } from '@dxos/react-components';

export type SpaceListProps = {
  value: PublicKey;
  spaces: Space[];
  onSelect: (spaceKey: PublicKey) => void;
  onShare: (spaceKey: PublicKey) => void;
};

export const SpaceList = ({ value, spaces, onSelect, onShare }: SpaceListProps) => {
  return (
    <div className='flex flex-col'>
      {spaces.map((space) => (
        <div
          key={space.key.toHex()}
          className={mx(
            'flex p-2 pl-3 pr-4 items-center hover:bg-selection-hover',
            space.key.equals(value) && 'hover:bg-selection-bg bg-selection-bg'
          )}
        >
          <div className={mx('flex mr-3', space.key.equals(value) && 'text-selection-text')}>
            <Planet className={getSize(6)} />
          </div>

          <div className='flex flex-1 font-mono cursor-pointer' onClick={() => onSelect(space.key)}>
            {space.key.truncate()}
          </div>

          {space.key.equals(value) && (
            <div className='flex cursor-pointer' onClick={() => onShare(space.key)} data-testid='space-settings'>
              <ShareNetwork className={getSize(6)} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
