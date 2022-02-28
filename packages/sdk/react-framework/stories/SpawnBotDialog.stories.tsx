//
// Copyright 2021 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { sleep } from '@dxos/async';
import { FullScreen } from '@dxos/react-components';
import { RegistryProvider } from '@dxos/react-registry-client';

import { ErrorBoundary, SpawnBotDialog } from '../src';
import { createMockRegistryWithBots } from '../src/testing';
import { Column } from './helpers';

export default {
  title: 'react-framework/SpawnBotDialog'
};

const User = () => {
  const [open, setOpen] = useState(false);
  const [botRunning, setBotRunning] = useState(false);

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Spawn bot</Button>
      </Toolbar>
      {open && (
        <SpawnBotDialog
          open={open}
          onClose={() => setOpen(false)}
          onSpawn={async () => {
            await sleep(2000);
            setBotRunning(true);
          }}
        />
      )}
      <Box sx={{ marginTop: 2, padding: 1 }}>
        Bot running: {botRunning ? 'yes' : 'no'}
      </Box>
    </Box>
  );
};

export const Primary = () => {
  const mockRegistry = useMemo(createMockRegistryWithBots, []);

  return (
    <FullScreen>
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <RegistryProvider registry={mockRegistry}>
            <Column>
              <User />
            </Column>
          </RegistryProvider>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
