//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { List, ListItem, ListItemEndcap } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useFrameRegistry } from '@dxos/kai-frames';

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
      <List aria-labelledby='objects'>
        {activeFrames
          .map((frameId) => frameRegistry.getFrameDef(frameId)!)
          .filter(Boolean)
          .map(({ module: { id, displayName }, runtime: { Icon } }) => (
            <ListItem
              id={id}
              key={id}
              className={['flex w-full px-3 items-center', id === currentFrame?.module.id && 'bg-zinc-200']}
            >
              <Link key={id} className='flex w-full items-center' to={createPath({ spaceKey: space.key, frame: id })}>
                <ListItemEndcap className='items-center'>
                  <Icon className={getSize(6)} />
                </ListItemEndcap>
                <div className='pl-1'>{displayName}</div>
              </Link>
            </ListItem>
          ))}
      </List>
    </div>
  );
};
