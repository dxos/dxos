//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { itemAdapter, useTestParty } from '@dxos/react-client-testing';
import { FullScreen } from '@dxos/react-components';
import { EchoGraph, useGraphModel } from '@dxos/react-framework';

import { EchoGrid, Layout } from '../src';
import { graphStyles, tableStyles } from './helpers';

export default {
  title: 'KitchenSink/Layout'
};

faker.seed(100);

// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).
// TODO(burdon): dxos:item/party (replace or change slash).

const App = () => {
  const party = useTestParty();
  const model = useGraphModel(party);

  return (
    <FullScreen>
      <Layout
        sidebar={(
          <EchoGrid
            items={model.graph.nodes}
            itemAdapter={itemAdapter}
            styles={tableStyles}
          />
        )}
      >
        <EchoGraph
          model={model}
          itemAdapter={itemAdapter}
          styles={graphStyles}
        />
      </Layout>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};
