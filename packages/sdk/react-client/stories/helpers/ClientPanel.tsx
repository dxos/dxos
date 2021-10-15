//
// Copyright 2021 DXOS.org
//

import { Box } from '@mui/material';
import React from 'react';

import { Client } from '@dxos/client';
import { Party } from '@dxos/echo-db';

import { JsonPanel } from './JsonPanel';

export const ClientPanel = ({
  client,
  profile = {},
  parties = []
}: {
  client: Client,
  profile?: any, // TODO(burdon): Require type definition.
  parties?: Party[]
}) => {
  const data = (parties.length !== 0)
    ? {
        parties: parties.map(({ key }) => key.toHex())
      }
    : undefined;

  return (
    <Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.config} />
      </Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.info()} />
      </Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={profile?.username} />
      </Box>
      {data && (
        <Box sx={{ padding: 1 }}>
          <JsonPanel value={data} />
        </Box>
      )}
    </Box>
  );
};
