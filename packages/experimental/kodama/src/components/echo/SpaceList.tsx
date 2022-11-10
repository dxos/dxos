//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';

import { List } from '../util';

export const SpaceList: FC<{
  spaceKey?: PublicKey;
  onSelect: (spaceKey: PublicKey) => void;
}> = ({
  spaceKey, // TODO(burdon): Selection not set.
  onSelect
}) => {
  const parties = useSpaces();

  return (
    <List
      id='space-list'
      focusId='space-list'
      showCount
      onSelect={(spaceKey) => onSelect(PublicKey.from(spaceKey))}
      items={parties.map((space) => ({
        id: space.key.toHex(),
        key: truncateKey(space.key, 4),
        text: space.getProperty('title')
      }))}
    />
  );
};
