//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { useClient, useParties } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';

import { PartySelect } from '../components';
import { useStream } from '../hooks';

export const CredentialMessagesPanel = () => {
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();
  const parties = useParties();

  const client = useClient();
  const devtoolsHost = client.services.DevtoolsHost;
  const result = useStream(
    () => devtoolsHost.SubscribeToCredentialMessages({ partyKey: selectedParty?.key }),
    [selectedParty?.key]
  );

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      overflow: 'hidden'
    }}>
      <Box padding={1}>
        <PartySelect
          parties={parties}
          selected={selectedParty}
          onChange={setSelectedParty}
        />
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <JsonTreeView
          size='small'
          data={result?.messages}
        />
      </Box>
    </Box>
  );
};
