//
// Copyright 2022 DXOS.org
//

import { Kanban, Planet, ShareNetwork } from 'phosphor-react';
import React from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { getSize, mx } from '@dxos/react-components';

enum SpaceItemAction {
  SELECT = 1,
  SHARE = 2
}

export type SpaceItemProps = {
  space: Space;
  selected?: boolean;
  onAction: (action: SpaceItemAction) => void;
};

// TODO(burdon): Frame API provides compact view.
const items = [
  {
    id: 'item-1',
    Icon: Kanban,
    label: 'Org chart'
  },
  {
    id: 'item-2',
    Icon: Kanban,
    label: 'Team planning'
  },
  {
    id: 'item-3',
    Icon: Kanban,
    label: 'Tasks'
  },
  {
    id: 'item-4',
    Icon: Kanban,
    label: 'Recruiting'
  }
];

// TODO(burdon): Repurposable panel (compact, vs full mode). Tile?
// TODO(burdon): Editable space name?
// TODO(burdon): Action menu.
// TODO(burdon): Full width mobile.
const SpaceItem = ({ space, selected, onAction }: SpaceItemProps) => {
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

      {selected && false && (
        <div className='flex bg-white'>
          <ul>
            {items.map(({ id, Icon, label }) => (
              <div key={id} className='flex items-center px-3 py-2 text-sm'>
                <div className='pr-3'>
                  <Icon className={getSize(6)} />
                </div>
                <div>{label}</div>
              </div>
            ))}
          </ul>
        </div>
      )}
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
        />
      ))}
    </div>
  );
};
