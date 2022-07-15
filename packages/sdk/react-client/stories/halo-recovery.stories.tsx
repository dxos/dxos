//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Input, Paper, Toolbar
} from '@mui/material';

import { generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/crypto';

import {
  ClientProvider, useClient,
  useParties,
  useProfile
} from '../src';
import {
  ClientPanel, Container
} from './helpers';

export default {
  title: 'react-client/HALO Recovery'
};

const HaloCreationContainer = () => {
  const client = useClient();
  const profile = useProfile();
  const [seed, setSeed] = useState('');

  const handleCreateHalo = async () => {
    const seedPhrase = generateSeedPhrase();
    const keyPair = keyPairFromSeedPhrase(seedPhrase);
    await client.halo.createProfile({ ...keyPair });
    setSeed(seedPhrase);
  };

  return (
    <Box sx={{ padding: 1 }}>
      {profile && (
        <p>Generated with seedphrase: {seed}</p>
      )}
      {!profile && (
        <Toolbar>
          <Button
            onClick={handleCreateHalo}
          >
            Create Halo
          </Button>
        </Toolbar>
      )}

    </Box>
  );
};

const HaloRecoveryContainer = () => {
  const client = useClient();
  const [seed, setSeed] = useState('');

  const handleRecover = async () => {
    await client.halo.recoverProfile(seed);
  };

  return (
    <Box sx={{ padding: 1 }}>
      <Input
        value={seed}
        onChange={(e) => setSeed(e.target.value)}
      />
      <Button
        disabled={!seed}
        onClick={handleRecover}
      >
        Recover
      </Button>
    </Box>
  );
};

const TestApp = () => {
  const client = useClient();
  const parties = useParties();
  const profile = useProfile();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      flexShrink: 0,
      overflow: 'hidden',
      margin: 1
    }}>
      <Paper>
        <ClientPanel client={client} profile={profile} parties={parties} />
        <Divider />
        <HaloCreationContainer />
        {!profile && (
          <>
            <Divider />
            <HaloRecoveryContainer />
          </>
        )}
      </Paper>
    </Box>
  );
};

export const HaloRecovery = () => (
  <Container>
    <Box sx={{ display: 'flex', flex: 1, padding: 1, justifyContent: 'space-around' }}>
      {/* Instantiated Client. */}
      <ClientProvider>
        <TestApp />
      </ClientProvider>

      <ClientProvider>
        <TestApp />
      </ClientProvider>
    </Box>
  </Container>
);
