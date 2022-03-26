//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { Box, Button, css } from '@mui/material';

import { ItemID } from '@dxos/echo-protocol';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { execSelection, itemAdapter, SelectionEditor, typeMeta, usePartyBuilder, useTestParty } from '@dxos/react-client-testing';

import { BoxContainer, EchoGraph, FullScreen, useGraphModel } from '../src';
import { defaultSelectionText } from './helpers';

export default {
  title: 'KitchenSink/EchoGraph'
};

faker.seed(100);

const graphStyles = css`
  ${Object.keys(typeMeta).map(
    type => `g.${type.replace(/\W/g, '_')} { circle { fill: ${typeMeta[type].color[100]}; } }`)}
`;

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
  const builder = usePartyBuilder(party);
  const [selected, setSelected] = useState<Set<ItemID>>(new Set());
  if (!party) {
    return null;
  }

  const handleSelection = (text: string) => {
    const selection = execSelection(party, text);
    const result = selection?.query();
    const selected = new Set<ItemID>();
    result?.entities.forEach(item => selected.add(item.id));
    setSelected(selected);
    model.refresh();
  };

  const handleGenerate = async () => {
    await builder?.createRandomItem();
  };

  return (
    <BoxContainer expand column>
      <Box sx={{ display: 'flex' }}>
        <SelectionEditor
          initialValue={defaultSelectionText}
          onChange={handleSelection}
          delay={100}
        />
        <Box>
          <Button onClick={handleGenerate}>Generate</Button>
        </Box>
      </Box>

      <BoxContainer expand>
        <EchoGraph
          model={model}
          selected={selected}
          itemAdapter={itemAdapter}
          styles={graphStyles}
        />
      </BoxContainer>
    </BoxContainer>
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
