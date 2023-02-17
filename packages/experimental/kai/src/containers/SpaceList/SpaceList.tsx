//
// Copyright 2022 DXOS.org
//

import { DotsThreeVertical } from 'phosphor-react';
import React, { ReactNode } from 'react';
import { useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { withReactor } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { humanize } from '@dxos/util';

import { getThemeClasses, useFrames } from '../../hooks';

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
const SpaceItem = withReactor(({ space, selected, children, onAction }: SpaceItemProps) => {
  const { Icon } = getThemeClasses(space.key);

  // TODO(burdon): Use List.
  return (
    <div
      className={mx(
        'flex flex-col overflow-hidden mt-2 mx-2 border',
        'hover:bg-selection-hover',
        selected && 'hover:bg-selection-bg bg-selection-bg border-selection-border'
      )}
    >
      <div className={mx('flex w-full overflow-hidden px-0 items-center')}>
        <div
          className='flex flex-1 overflow-hidden font-mono cursor-pointer'
          onClick={() => onAction(SpaceItemAction.SELECT)}
        >
          <div className={mx('flex m-2', selected && 'text-selection-text')}>
            <Icon className={getSize(6)} />
          </div>

          {/* TODO(burdon): Use <Input />. */}
          <input
            className='w-full px-1 mx-1 bg-transparent'
            value={space.properties.name ?? humanize(space.key)}
            onChange={(event) => {
              space.properties.name = event.target.value;
            }}
          />
        </div>

        <Button
          compact
          variant='ghost'
          className={mx(selected ? 'flex' : 'invisible')}
          title='Create new space'
          onClick={() => onAction(SpaceItemAction.SHARE)}
          data-testid='space-settings'
        >
          <DotsThreeVertical className={getSize(6)} />
        </Button>
      </div>

      {selected && <div className='flex bg-paper-bg'>{children}</div>}
    </div>
  );
});

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
    <div className='flex flex-col flex-1 overflow-hidden'>
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
