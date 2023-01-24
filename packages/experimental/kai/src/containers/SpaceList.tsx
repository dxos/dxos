//
// Copyright 2022 DXOS.org
//

import { Gear, Planet } from 'phosphor-react';
import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { createSpacePath } from '../app';
import { FrameID } from '../hooks';

export const SpaceList = () => {
  const { spaceKey: currentSpaceKey, frame } = useParams();
  const spaces = useSpaces();

  return (
    <div className='flex flex-col'>
      {spaces.map((space) => (
        <div
          key={space.key.toHex()}
          className={mx('flex p-2 pl-3 pr-4 items-center', space.key.truncate() === currentSpaceKey && 'bg-orange-200')}
        >
          <div className={mx('mr-3', space.key.truncate() === currentSpaceKey && 'text-orange-500')}>
            <Planet className={getSize(6)} />
          </div>

          <div className='flex flex-1 font-mono cursor-pointer'>
            <Link to={createSpacePath(space.key, frame)}>{space.key.truncate()}</Link>
          </div>

          {space.key.truncate() === currentSpaceKey && (
            <div className='flex items-center'>
              <Link to={createSpacePath(space.key, FrameID.SETTINGS)}>
                <Gear className={getSize(5)} />
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
