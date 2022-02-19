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

  const handleChange = (selection?: Selection<any>) => {
    const { result = [] } = selection?.query() ?? {};
    const selected = new Set<ItemID>();
    result.forEach(item => selected.add(item.id));
    setSelected(selected);

    // TODO(burdon): Check changed.
    model.refresh();
  };

  return (
    <Box sx={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
      {party && (
        <SelectionEditor
          party={party}
          onChange={handleChange}
          delay={100}
        />
      )}

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <EchoGraph
          model={model}
          selected={selected}
          itemAdapter={itemAdapter}
          styles={graphStyles}
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
