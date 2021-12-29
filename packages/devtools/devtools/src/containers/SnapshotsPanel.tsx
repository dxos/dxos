//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Button, Toolbar } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { PartySnapshot } from '@dxos/echo-protocol';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { Panel, PartySelect } from '../components';

export const SnapshotsPanel = () => {
  const parties = useParties();
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const [snapshot, setSnapshot] = useState<PartySnapshot>();

  const handlePartyChange = (party: PartyProxy | undefined) => {
    setSelectedParty(party);
    if (party) {
      setImmediate(async () => {
        const { snapshot } = await devtoolsHost.GetPartySnapshot({ partyKey: party.key });
        setSnapshot(snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (selectedParty) {
      const { snapshot } = await devtoolsHost.SavePartySnapshot({ partyKey: selectedParty.key });
      setSnapshot(snapshot);
    }
  };

  const handleClearSnapshots = async () => {
    await devtoolsHost.ClearSnapshots({});
  };

  return (
    <Panel controls={(
      <>
        <Toolbar>
          <Button variant='outlined' onClick={handleSaveSnapshot} disabled={!selectedParty}>Save Snapshot</Button>
          <Button onClick={handleClearSnapshots}>Delete Snapshots</Button>
        </Toolbar>
        <PartySelect
          parties={parties}
          selected={selectedParty}
          onChange={handlePartyChange}
        />
      </>
    )}>
      <JsonTreeView
        size='small'
        data={snapshot}
      />
    </Panel>
  );
};
