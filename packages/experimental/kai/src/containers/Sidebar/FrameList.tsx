//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { getSize, mx } from '@dxos/aurora';
import { useFrameRegistry } from '@dxos/kai-frames';
import { List, ListItem, ListItemEndcap } from '@dxos/react-appkit';

import { createPath, useAppRouter, useAppState } from '../../hooks';

export const FrameList = () => {
  const { space, frame: currentFrame } = useAppRouter();
  const { frames: activeFrames } = useAppState();
  const frameRegistry = useFrameRegistry();
  if (!space) {
    return null;
  }

  // TODO(burdon): Remove unnecessary classes.
  return (
    <div className='is-full'>
      <List labelId='objects'>
        {activeFrames
          .map((frameId) => frameRegistry.getFrameDef(frameId)!)
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
