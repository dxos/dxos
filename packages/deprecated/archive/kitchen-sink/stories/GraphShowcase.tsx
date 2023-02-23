//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider } from '@dxos/react-client';
import { itemAdapter, ProfileInitializer, useTestSpace } from '@dxos/react-client-testing';
import { EchoGraph, useGraphModel } from '@dxos/react-echo-graph';

import { graphStyles } from '../src';

faker.seed(100);

interface AppProps {
  grid?: boolean;
}

const App = ({ grid }: AppProps) => {
  const space = useTestSpace();
  const model = useGraphModel(space, [(item) => Boolean(item.type?.startsWith('example:'))]);

  return (
    <EchoGraph
      model={model}
      itemAdapter={itemAdapter}
      styles={graphStyles}
      options={{
        grid
      }}
    />
  );
};

/**
 * Component embedded within MDX.
 * @constructor
 */
export const GraphShowcase = (options: AppProps) => (
  <ClientProvider>
    <ProfileInitializer>
      <App {...options} />
    </ProfileInitializer>
  </ClientProvider>
);
