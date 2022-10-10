//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { ClientProvider } from '@dxos/react-client';

import { defaultSelectionText, execSelection, ProfileInitializer, SelectionEditor, useTestParty } from '../src/index.js';

export default {
  title: 'react-client-testing/SelectionEditor'
};

const App = () => {
  const [result, setResult] = useState<number>(0);
  const party = useTestParty();
  if (!party) {
    return null;
  }

  const handleChange = (text: string) => {
    const selection = execSelection(party, text);
    if (selection) {
      const result = selection.exec();
      setResult(result.entities.length);
    } else {
      setResult(0);
    }
  };

  return (
    <Box sx={{ padding: 1 }}>
      <SelectionEditor
        initialValue={defaultSelectionText}
        onChange={handleChange}
        delay={100}
      />
      <br />
      <br />

      <SelectionEditor
        onChange={handleChange}
        delay={100}
      />

      <Box sx={{ padding: 1 }}>
        {result}
      </Box>
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
