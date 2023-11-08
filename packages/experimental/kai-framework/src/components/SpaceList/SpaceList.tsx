//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { Space } from '@dxos/react-client/echo';

import { SpaceItem } from './SpaceItem';
import { Intent } from '../../util';

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
