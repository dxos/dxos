//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { useFrameRegistry } from '@dxos/kai-frames';
import { List, ListItem } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

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
            <ListItem.Root
              id={id}
              key={id}
              classNames={['flex w-full px-3 items-center', id === currentFrame?.module.id && 'bg-zinc-200']}
            >
              <Link key={id} className='flex w-full items-center' to={createPath({ spaceKey: space.key, frame: id })}>
                <ListItem.Endcap classNames='items-center'>
                  <Icon className={getSize(6)} />
                </ListItem.Endcap>
                <div className='pl-1'>{displayName}</div>
              </Link>
            </ListItem.Root>
          ))}
      </List>
    </div>
  );
};
