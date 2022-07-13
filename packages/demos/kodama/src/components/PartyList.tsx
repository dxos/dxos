//
// Copyright 2022 DXOS.org
//

import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { useClient, useParties } from '@dxos/react-client';

import { List } from './List';
import { Panel } from './Panel';
import { PartyView } from './PartyView';

export const PartyList: FC<{
  partyKey?: PartyKey
}> = ({
  partyKey: controlledPartyKey
}) => {
  const [partyKey, setPartyKey] = useState<PartyKey | undefined>(controlledPartyKey);
  const parties = useParties();
  const client = useClient();

  const handleUpdate = (data: { id?: string | undefined, text: string }) => {
    if (partyKey) {
      const party = parties.find(party => party.key.toHex() === data.id);
      void party!.setProperty('title', data.text);
    } else {
      setImmediate(async () => {
        const party = await client.echo.createParty();
        void party.setProperty('title', data.text);
        setPartyKey(party.key);
      });
    }
  };

  if (partyKey) {
    return (
      <PartyView
        partyKey={partyKey}
        onExit={() => {
          setPartyKey(undefined);
        }}
      />
    );
  }

  return (
    <Panel>
      <List
        showCount
        onUpdate={handleUpdate}
        onSelect={partyKey => setPartyKey(PublicKey.from(partyKey))}
        items={parties.map(party => ({
          id: party.key.toHex(),
          text: party.getProperty('title')
        }))}
      />
    </Panel>
  );
};
