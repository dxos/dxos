//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { Box } from '@mui/material';

import { Selection } from '@dxos/echo-db';
import { ItemID } from '@dxos/echo-protocol';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoGraph, SelectionEditor } from '../src';
import { itemAdapter, graphStyles, useGraphModel, useTestParty } from './helpers';

export default {
  title: 'KitchenSink/EchoGraph'
};

faker.seed(100);

const App = () => {
  const party = useTestParty();
  const model = useGraphModel(party);

  return (
    <EchoGraph
      model={model}
      itemAdapter={itemAdapter}
      styles={graphStyles}
    />
  );
};

const AppWithEditor = () => {
  const party = useTestParty();
  const model = useGraphModel(party);
  const [selected, setSelected] = useState<Set<ItemID>>(new Set());

  const handleUpdate = (selection?: Selection<any>) => {
    const selected = new Set<ItemID>();
    const { result = [] } = selection?.query() ?? {};
    result.forEach(item => selected.add(item.id));
    setSelected(selected);
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
      {party && (
        <SelectionEditor
          party={party}
          onUpdate={handleUpdate}
        />
      )}

      <Box sx={{ display: 'flex', flex: 1 }}>
        <EchoGraph
          model={model}
          itemAdapter={itemAdapter}
          styles={graphStyles}
          selected={selected}
        />
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <FullScreen>
          <App />
        </FullScreen>
      </ProfileInitializer>
    </ClientProvider>
  );
};

export const Secondary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <FullScreen>
          <AppWithEditor />
        </FullScreen>
      </ProfileInitializer>
    </ClientProvider>
  );
};
