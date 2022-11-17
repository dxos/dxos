//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';

import { defaultSelectionText, execSelection, ProfileInitializer, SelectionEditor, useTestSpace } from '../src';

export default {
  title: 'react-client-testing/SelectionEditor'
};

const App = () => {
  const [result, setResult] = useState<number>(0);
  const space = useTestSpace();
  if (!space) {
    return null;
  }

  const handleChange = (text: string) => {
    const selection = execSelection(space, text);
    if (selection) {
      const result = selection.exec();
      setResult(result.entities.length);
    } else {
      setResult(0);
    }
  };

  return (
    <Box sx={{ padding: 1 }}>
      <SelectionEditor initialValue={defaultSelectionText} onChange={handleChange} delay={100} />
      <br />
      <br />

      <SelectionEditor onChange={handleChange} delay={100} />

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
