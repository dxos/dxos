//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { Intent } from '../../util';
import { SpaceItem } from './SpaceItem';

export type SpaceListAction = {
  spaceKey: PublicKey;
  modifier?: boolean;
};

export type SpaceListProps = {
  spaces: Space[];
  selected?: PublicKey;
  onAction?: (intent: Intent<SpaceListAction>) => void;
};

export const SpaceList = ({ spaces, selected, onAction }: SpaceListProps) => {
  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      {spaces.map((space) => (
        <SpaceItem
          key={space.key.toHex()}
          space={space}
          selected={selected && space.key.equals(selected)}
          onAction={(intent) => onAction?.(intent)}
        />
      ))}
    </div>
  );
};
