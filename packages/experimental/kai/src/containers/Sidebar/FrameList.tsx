//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { createPath, useAppRouter, useFrames } from '../../hooks';

// TODO(burdon): Collapse to selector if > 8.
export const FrameList = () => {
  const { space } = useAppRouter();
  const { frames, active: activeFrames } = useFrames();
  const { frame: currentFrame } = useAppRouter();
  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col'>
      <div className='flex flex-col'>
        {Array.from(activeFrames)
          .map((frameId) => frames.get(frameId)!)
          .filter(Boolean)
          .map(({ module: { id, displayName }, runtime: { Icon } }) => (
            <Link
              key={id}
              className={mx('flex w-full px-4 py-1 items-center', id === currentFrame?.module.id && 'bg-zinc-200')}
              to={createPath({ spaceKey: space.key, frame: id })}
            >
              <Icon className={getSize(6)} />
              <div className='flex w-full pl-2'>{displayName}</div>
            </Link>
          ))}
      </div>
    </div>
  );
};
