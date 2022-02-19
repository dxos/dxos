//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';

import { EchoGraph } from '../src';
import { itemAdapter, graphStyles, useGraphModel } from './helpers';

export default {
  title: 'KitchenSink/EchoGraph'
};

faker.seed(100);

const App = () => {
  const model = useGraphModel();

  return (
    <EchoGraph
      model={model}
      itemAdapter={itemAdapter}
      styles={graphStyles}
    />
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
