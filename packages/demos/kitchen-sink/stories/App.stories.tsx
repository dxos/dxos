//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoGraph, EchoTable, Layout } from '../src';
import { useGraphModel } from './helpers';

export default {
  title: 'KitchenSink/App'
};

// TODO(burdon): Devtools mesh.
// TODO(burdon): createItem defaults.
// TODO(burdon): useSelection ?? [] (create default).
// TODO(burdon): dxos:item/party (replace or change slash).

const App = () => {
  const model = useGraphModel();

  return (
    <FullScreen>
      <Layout
        sidebar={(
          <EchoTable
            items={model.graph.nodes}
          />
        )}
      >
        <EchoGraph
          model={model}
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
