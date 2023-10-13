//
// Copyright 2022 DXOS.org
//

import React, { type FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';

import { List } from '../util';

export const SpaceList: FC<{
  spaceKey?: PublicKey;
  onSelect: (spaceKey: PublicKey) => void;
}> = ({
  spaceKey, // TODO(burdon): Selection not set.
  onSelect,
}) => {
  const spaces = useSpaces();

  return (
    <List
      id='space-list'
      focusId='space-list'
      showCount
      onSelect={(spaceKey) => onSelect(PublicKey.from(spaceKey))}
      items={spaces.map((space) => ({
        id: space.key.toHex(),
        key: truncateKey(space.key),
        text: space.properties.name,
      }))}
    />
  );
};
