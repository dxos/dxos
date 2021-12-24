//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { PartySnapshot } from '@dxos/echo-protocol';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { PartySelect } from '../components';

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
        const result = await devtoolsHost.GetPartySnapshot({ partyKey: party.key });
        setSnapshot(result.snapshot);
      });
    }
  };

  const handleSaveSnapshot = async () => {
    if (selectedParty) {
      const result = await devtoolsHost.SavePartySnapshot({ partyKey: selectedParty.key });
      setSnapshot(result.snapshot);
    }
  };

  const handleClearSnapshots = async () => {
    await devtoolsHost.ClearSnapshots({});
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden'
    }}>
      <Box>
        <Toolbar variant='dense' disableGutters>
          <Button onClick={handleSaveSnapshot} disabled={!selectedParty}>Save Snapshot</Button>
          <Button onClick={handleClearSnapshots}>Delete Snapshots</Button>
        </Toolbar>
        <Box padding={1}>
          <PartySelect
            parties={parties}
            selected={selectedParty}
            onChange={handlePartyChange}
          />
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <JsonTreeView
          size='small'
          data={snapshot}
        />
      </Box>
    </Box>
  );
};
