//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { useParties } from '@dxos/react-client';

import { List } from '../util';

export const PartyList: FC<{
  spaceKey?: PublicKey;
  onSelect: (spaceKey: PublicKey) => void;
}> = ({
  spaceKey, // TODO(burdon): Selection not set.
  onSelect
}) => {
  const parties = useParties();

  return (
    <List
      id='party-list'
      focusId='party-list'
      showCount
      onSelect={(spaceKey) => onSelect(PublicKey.from(spaceKey))}
      items={parties.map((party) => ({
        id: party.key.toHex(),
        key: truncateKey(party.key, 4),
        text: party.getProperty('title')
      }))}
    />
  );
};
