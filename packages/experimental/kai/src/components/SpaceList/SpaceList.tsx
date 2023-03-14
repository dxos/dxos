//
// Copyright 2022 DXOS.org
//

import React, { Suspense } from 'react';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-components';

import { FrameDef } from '../../hooks';
import { Intent } from '../../util';
import { SpaceItem } from './SpaceItem';

export type SpaceListAction = {
  spaceKey: PublicKey;
  modifier?: boolean;
};

export type SpaceListProps = {
  spaces: Space[];
  selected?: PublicKey;
  frame?: FrameDef;
  onAction?: (intent: Intent<SpaceListAction>) => void;
};

export const SpaceList = ({ spaces, selected, frame, onAction }: SpaceListProps) => {
  const List = frame?.runtime.List;

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      {spaces.map((space) => (
        <SpaceItem
          key={space.key.toHex()}
          space={space}
          selected={selected && space.key.equals(selected)}
          onAction={(intent) => onAction?.(intent)}
        >
          {false && (
            <DensityProvider density='coarse'>
              <Suspense>{List && <List />}</Suspense>
            </DensityProvider>
          )}
        </SpaceItem>
      ))}
    </div>
  );
};
