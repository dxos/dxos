//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, css } from '@mui/material';

import { ItemID, PARTY_ITEM_TYPE } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
// TODO(kaplanski): Review execSelection, itemAdapter, typeMeta. Too ambigiuous to be exported concepts.
import {
  ProfileInitializer, SelectionEditor, defaultSelectionText, execSelection, itemAdapter,
  typeMeta, usePartyBuilder, useTestParty
} from '@dxos/react-client-testing';
import { BoxContainer, FullScreen } from '@dxos/react-components';

import { EchoGraph, useGraphModel } from '../src/index.js';

export default {
  title: 'KitchenSink/EchoGraph'
};

const graphStyles = css`
  ${Object.keys(typeMeta).map(
    type => `g.${type.replace(/\W/g, '_')} { circle { fill: ${typeMeta[type].color[100]}; } }`)}
`;

const App = () => {
  const party = useTestParty();
  const model = useGraphModel(party, [(item) => Boolean(item.type?.startsWith('example:')) || item.type === PARTY_ITEM_TYPE]);

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
  const model = useGraphModel(party, [(item) => Boolean(item.type?.startsWith('example:'))]);
  const builder = usePartyBuilder(party);
  const [selected, setSelected] = useState<Set<ItemID>>(new Set());
  if (!party) {
    return null;
  }

  const handleSelection = (text: string) => {
    const selection = execSelection(party, text);
    const result = selection?.exec();
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

export const Primary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <FullScreen>
        <App />
      </FullScreen>
    </ProfileInitializer>
  </ClientProvider>
);

export const Secondary = () => (
  <ClientProvider>
    <ProfileInitializer>
      <FullScreen>
        <AppWithEditor />
      </FullScreen>
    </ProfileInitializer>
  </ClientProvider>
);

const embedStyles = {
  boxSizing: 'border-box',
  margin: '0.5em auto',
  padding: '0 40px',
  width: '100%',
  maxWidth: '900px',
  position: 'relative',
  transition: '0.3s ease-out',
  borderLeft: '3px solid transparent',
  borderRight: '3px solid transparent',
  resize: 'vertical',
  overflow: 'auto'
};

export const Embedded = () => (
  <ClientProvider>
    <ProfileInitializer>
      <FullScreen>
        <Box sx={embedStyles}>
          <App />
        </Box>
      </FullScreen>
    </ProfileInitializer>
  </ClientProvider>
);
