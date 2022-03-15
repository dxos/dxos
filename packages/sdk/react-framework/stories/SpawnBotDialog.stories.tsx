//
// Copyright 2021 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { sleep } from '@dxos/async';
import { FullScreen } from '@dxos/react-components';
import { RegistryProvider, useRegistry } from '@dxos/react-registry-client';
import { IRegistryClient, Resource } from '@dxos/registry-client';

import { ErrorBoundary, SpawnBotDialog } from '../src';
import { createMockRegistryWithBots, Column } from './helpers';

export default {
  title: 'react-framework/SpawnBotDialog'
};

const User = () => {
  const [open, setOpen] = useState(false);
  const [bot, setBot] = useState<Resource>();
  const registry = useRegistry();

  console.log(bot);

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Spawn bot</Button>
        <Button onClick={() => setBot(undefined)}>Stop bot</Button>
      </Toolbar>

      <SpawnBotDialog
        registry={registry}
        open={open}
        onClose={() => setOpen(false)}
        onSelect={async (resource: Resource) => {
          await sleep(2000);
          setBot(resource);
        }}
      />

      <Box sx={{ marginTop: 2, padding: 1 }}>
        {bot && `Running: ${bot.id.toString()}`}
      </Box>
    </Box>
  );
};

export const Primary = () => {
  const mockRegistry = useMemo<IRegistryClient>(createMockRegistryWithBots, []);

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
