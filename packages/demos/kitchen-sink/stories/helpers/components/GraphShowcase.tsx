import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';

import { useTestParty, useGraphModel, itemAdapter, graphStyles } from '../';
import { EchoGraph } from '../../../src';

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

export const GraphShowcase = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
}