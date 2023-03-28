//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, List, ListItem, ListItemEndcap, mx } from '@dxos/react-components';

import { createPath, useAppRouter, useFrames } from '../../hooks';

export const FrameList = () => {
  const { space } = useAppRouter();
  const { frames, active: activeFrames } = useFrames();
  const { frame: currentFrame } = useAppRouter();
  if (!space) {
    return null;
  }

  // TODO(burdon): Remove unnecessary classes.
  return (
    <div className='is-full'>
      <List labelId='objects'>
        {Array.from(activeFrames)
          .map((frameId) => frames.get(frameId)!)
          .filter(Boolean)
          .map(({ module: { id, displayName }, runtime: { Icon } }) => (
            <ListItem
              id={id}
              key={id}
              slots={{
                root: { className: mx(id === currentFrame?.module.id && 'bg-zinc-200') },
                // TODO(burdon): Rename slot "main"?
                mainContent: { className: 'flex w-full px-3 items-center' }
              }}
            >
              <Link key={id} className='flex w-full items-center' to={createPath({ spaceKey: space.key, frame: id })}>
                <ListItemEndcap asChild>
                  {/* TODO(burdon): Why is div needed? */}
                  <div className='flex items-center'>
                    <Icon className={getSize(6)} />
                  </div>
                </ListItemEndcap>
                <div className='pl-1'>{displayName}</div>
              </Link>
            </ListItem>
          ))}
      </List>
    </div>
  );
};
