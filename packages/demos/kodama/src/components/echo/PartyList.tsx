//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { PartyKey } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/protocols';
import { useParties } from '@dxos/react-client';

import { List } from '../util';

export const PartyList: FC<{
  partyKey?: PartyKey
  onSelect: (partyKey: PartyKey) => void
}> = ({
  partyKey: controlledPartyKey,
  onSelect
}) => {
  const parties = useParties();

  return (
    <List
      showCount
      onSelect={partyKey => onSelect(PublicKey.from(partyKey))}
      items={parties.map(party => ({
        id: party.key.toHex(),
        key: truncateKey(party.key, 4),
        text: party.getProperty('title')
      }))}
    />
  );
};
