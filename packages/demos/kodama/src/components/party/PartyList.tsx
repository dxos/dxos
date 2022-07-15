//
// Copyright 2022 DXOS.org
//

import { useFocusManager } from 'ink';
import React, { FC, useState } from 'react';

import { PartyKey } from '@dxos/client';
import { PublicKey } from '@dxos/protocols';
import { useClient, useParties } from '@dxos/react-client';

import { List } from '../util';
import { PartyView } from './PartyView';

export const PartyList: FC<{
  partyKey?: PartyKey
}> = ({
  partyKey: controlledPartyKey
}) => {
  const [partyKey, setPartyKey] = useState<PartyKey | undefined>(controlledPartyKey);
  const parties = useParties();
  const client = useClient();
  const { focus } = useFocusManager();

  const handleUpdate = (data: { id?: string | undefined, text: string }) => {
    if (data.id) {
      // Update party.
      const partyKey = PublicKey.from(data.id);
      const party = parties.find(party => party.key.equals(partyKey));
      void party!.setProperty('title', data.text);
    } else {
      // Create party.
      setImmediate(async () => {
        const party = await client.echo.createParty();
        void party.setProperty('title', data.text);
        // setPartyKey(party.key);
      });
    }
  };

  if (partyKey) {
    return (
      <PartyView
        partyKey={partyKey}
        onExit={() => {
          setTimeout(() => { // TODO(burdon): React state update issue with ListItem's TextInput.
            setPartyKey(undefined);
            setTimeout(() => { // TODO(burdon): Wait for list to render.
              focus('party-list');
            });
          });
        }}
      />
    );
  }

  return (
    <List
      showCount
      focusId='party-list'
      onUpdate={handleUpdate}
      onSelect={partyKey => setPartyKey(PublicKey.from(partyKey))}
      items={parties.map(party => ({
        id: party.key.toHex(),
        text: party.getProperty('title')
      }))}
    />
  );
};
