//
// Copyright 2022 DXOS.org
//

import { DotsThreeVertical } from 'phosphor-react';
import React, { ReactNode } from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { withReactor } from '@dxos/react-client';
import { Button, getSize, Input, mx } from '@dxos/react-components';

import { getIcon, useAppRouter } from '../../hooks';

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
  const Icon = getIcon(space.properties.icon);

  // TODO(burdon): Use List.
  return (
    <div
      // style={{ marginTop: -1 }}
      className={mx(
        'flex flex-col overflow-hidden border first:mt-0 mt-[-1px]',
        'hover:bg-selection-hover',
        selected && 'z-10 hover:bg-selection-bg bg-selection-bg border-selection-border'
      )}
    >
      <div className={mx('flex w-full overflow-hidden px-0 items-center')}>
        <div
          className='flex flex-1 items-center overflow-hidden cursor-pointer'
          onClick={() => onAction(SpaceItemAction.SELECT)}
        >
          <div className={mx('flex m-2', selected && 'text-selection-text')}>
            <Icon className={getSize(6)} />
          </div>

          <Input
            variant='subdued'
            value={space.properties.name}
            onChange={(event) => {
              space.properties.name = event.target.value;
            }}
            label='Title'
            placeholder='Space title.'
            slots={{
              label: { className: 'sr-only' },
              input: { autoFocus: !space.properties.name?.length },
              root: {
                className: 'm-0'
              }
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
  selected?: PublicKey;
  onSelect: (spaceKey: PublicKey) => void;
  onShare: (spaceKey: PublicKey) => void;
};

// TODO(burdon): Use vertical mosaic.
export const SpaceList = ({ spaces, selected, onSelect, onShare }: SpaceListProps) => {
  const { frame } = useAppRouter();
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
    <div className='flex flex-col flex-1 overflow-hidden m-2'>
      {spaces.map((space) => (
        <SpaceItem
          key={space.key.toHex()}
          space={space}
          selected={selected && space.key.equals(selected)}
          onAction={(action) => handleAction(space.key, action)}
        >
          {Tile && <Tile />}
        </SpaceItem>
      ))}
    </div>
  );
};
