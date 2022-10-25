//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Box } from '@mui/material';

import { Client, Party } from '@dxos/client';

import { useProfile } from '../../src';
import { JsonPanel } from './JsonPanel';

export const ClientPanel = ({
  client,
  profile = {},
  parties = []
}: {
  client: Client;
  profile?: Partial<ReturnType<typeof useProfile>>;
  parties?: Party[];
}) => {
  const data =
    parties.length !== 0
      ? { parties: parties.map(({ key }) => key.toHex()) }
      : undefined;

  return (
    <Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.config} />
      </Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.info} />
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
