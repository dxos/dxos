//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { Selection } from '@dxos/echo-db'
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

import { SelectionEditor } from '../src';
import { useTestParty } from './helpers';

export default {
  title: 'KitchenSink/SelectionEditor'
};

const App = () => {
  const [result, setResult] = useState<number>(0);
  const party = useTestParty();
  if (!party) {
    return null;
  }

  const handleUpdate = (selection?: Selection<any>) => {
    if (selection) {
      const { result } = selection.query({}); // TODO(burdon): Allow no options.
      setResult(result?.length);
    } else {
      setResult(0);
    }
  };

  return (
    <Box sx={{ padding: 1 }}>
      <SelectionEditor
        party={party}
        onUpdate={handleUpdate}
      />

      <Box sx={{ padding: 1 }}>
        {result}
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <ClientProvider config={{}}>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
