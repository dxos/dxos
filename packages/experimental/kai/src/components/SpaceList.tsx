//
// Copyright 2022 DXOS.org
//

import { Planet, ShareNetwork } from 'phosphor-react';
import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { getSize, mx } from '@dxos/react-components';

import { useFrames } from '../hooks';

enum SpaceItemAction {
  SELECT = 1,
  SHARE = 2
}

export type SpaceItemProps = {
  space: Space;
  selected?: boolean;
  children?: ReactNode;
  onAction: (action: SpaceItemAction) => void;
};

// TODO(burdon): Repurposable panel (compact, vs full mode). Tile?
// TODO(burdon): Editable space name?
// TODO(burdon): Action menu.
// TODO(burdon): Full width mobile.
const SpaceItem = ({ space, selected, children, onAction }: SpaceItemProps) => {
  return (
    <div className={mx('flex flex-col mx-3 mt-3 border rounded')}>
      <div
        className={mx(
          'flex w-full p-2 pl-3 pr-4 items-center hover:bg-selection-hover',
          selected && 'hover:bg-selection-bg bg-selection-bg'
        )}
      >
        <div className={mx('flex mr-3', selected && 'text-selection-text')}>
          <Planet className={getSize(6)} />
        </div>

        <div className='flex flex-1 font-mono cursor-pointer' onClick={() => onAction(SpaceItemAction.SELECT)}>
          {space.key.truncate()}
        </div>

        {selected && (
          <div
            className='flex cursor-pointer'
            onClick={() => onAction(SpaceItemAction.SHARE)}
            data-testid='space-settings'
          >
            <ShareNetwork className={getSize(6)} />
          </div>
        )}
      </div>

      {selected && children}
    </div>
  );
};

export type SpaceListProps = {
  spaces: Space[];
  selected: PublicKey;
  onSelect: (spaceKey: PublicKey) => void;
  onShare: (spaceKey: PublicKey) => void;
};

// TODO(burdon): Use vertical mosaic.
export const SpaceList = ({ spaces, selected, onSelect, onShare }: SpaceListProps) => {
  // TODO(burdon): Move to containers.
  const { frame: currentFrame } = useParams();
  const { frames } = useFrames();

  const frame = currentFrame ? frames.get(currentFrame) : undefined;
  const Tile = frame?.runtime.Tile;

  // TODO(burdon): Factor pattern?
  const handleAction = (spaceKey: PublicKey, action: SpaceItemAction) => {
    switch (action) {
      case SpaceItemAction.SELECT: {
        onSelect(spaceKey);
        break;
      }

      case SpaceItemAction.SHARE: {
        onShare(spaceKey);
        break;
      }
    }
  };

  return (
    <div className='flex flex-col'>
      {spaces.map((space) => (
        <SpaceItem
          key={space.key.toHex()}
          space={space}
          selected={space.key.equals(selected)}
          onAction={(action) => handleAction(space.key, action)}
        >
          {Tile && <Tile />}
        </SpaceItem>
      ))}
    </div>
  );
};
