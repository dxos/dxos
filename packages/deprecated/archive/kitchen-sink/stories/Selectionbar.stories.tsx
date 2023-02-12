//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';

import { Searchbar } from '../src';

export default {
  title: 'KitchenSink/Searchbar'
};

const App = () => {
  const [result, setResult] = useState<string>('');

  const handleChange = (value: string) => {
    setResult(value);
  };

  return (
    <Box sx={{ padding: 1 }}>
      <Searchbar onChange={handleChange} delay={100} />

      <Box sx={{ padding: 1 }}>{result}</Box>
    </Box>
  );
};

export const Primary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <App />
    </ProfileInitializer>
  </ClientProvider>
);
