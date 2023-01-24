//
// Copyright 2022 DXOS.org
//

import { Planet, ShareNetwork } from 'phosphor-react';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { getSize, mx } from '@dxos/react-components';

import { createSpacePath, FrameID } from '../hooks';

export const SpaceList: FC<{ value: PublicKey; spaces: Space[]; onSelect: (spaceKey: PublicKey) => void }> = ({
  value,
  spaces,
  onSelect
}) => {
  return (
    <div className='flex flex-col'>
      {spaces.map((space) => (
        <div
          key={space.key.toHex()}
          className={mx('flex p-2 pl-3 pr-4 items-center', space.key.equals(value) && 'bg-orange-200')}
        >
          <div className={mx('mr-3', space.key.equals(value) && 'text-orange-500')}>
            <Planet className={getSize(6)} />
          </div>

          <div className='flex flex-1 font-mono cursor-pointer' onClick={() => onSelect(space.key)}>
            {space.key.truncate()}
          </div>

          {space.key.equals(value) && (
            <div className='flex items-center'>
              <Link to={createSpacePath(space.key, FrameID.SETTINGS)}>
                <ShareNetwork className={getSize(5)} />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
