//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { PartySnapshot } from '@dxos/echo-protocol';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { PartySelect } from '../components';

export const SnapshotsViewer = () => {
  const parties = useParties();
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const [snapshot, setSnapshot] = useState<PartySnapshot>();

  const handlePartyChange = (party: PartyProxy | undefined) => {
    setSelectedParty(party);
    if (party) {
      setImmediate(async () => {
        const result = await devtoolsHost.GetPartySnapshot({ partyKey: party.key });
        setSnapshot(result.snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (!selectedParty) {
      return;
    }

    const result = await devtoolsHost.SavePartySnapshot({ partyKey: selectedParty.key });
    setSnapshot(result.snapshot);
  };

  const handleClearSnapshots = async () => {
    await devtoolsHost.ClearSnapshots({});
  };

  return (
    <Box padding={2}>
      <Box marginBottom={1}>
        <Button onClick={handleSaveSnapshot}>Save Snapshot</Button>
        <Button onClick={handleClearSnapshots}>Clear All Snapshots</Button>
      </Box>
      <PartySelect
        parties={parties}
        value={selectedParty}
        onChange={handlePartyChange}
      />
      <Box marginTop={1}>
        <JsonTreeView
          size='small'
          data={snapshot}
        />
      </Box>
    </Box>
  );
};
