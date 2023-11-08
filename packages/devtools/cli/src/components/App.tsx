//
// Copyright 2023 DXOS.org
//

import { Box, Text, useApp, useInput } from 'ink';
import React, { type FC } from 'react';

import { type Client } from '@dxos/client';

import { SpaceTable } from './SpaceTable';
import { SystemTable } from './SystemTable';

/**
 * Spaces list table.
 */
export const App: FC<{ client: Client; interval?: number }> = ({ client, interval = 1000 }) => {
  const { exit } = useApp();
  useInput((input) => {
    switch (input) {
      case 'r': {
        // handleRefresh();
        break;
      }
      case 'q': {
        exit();
        break;
      }
    }
  });

  // https://github.com/vadimdemedes/ink
  return (
    <Box flexDirection='column'>
      <SystemTable />
      {false && <SpaceTable client={client} interval={interval} />}
      <Text>[q]uit; [r]efresh</Text>
    </Box>
  );
};
