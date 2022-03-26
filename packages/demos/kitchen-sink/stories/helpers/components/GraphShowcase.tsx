//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React from 'react';

import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { itemAdapter, useTestParty } from '@dxos/react-client-testing';
import { EchoGraph, useGraphModel } from '@dxos/react-framework';

import { graphStyles } from '../';

faker.seed(100);

interface AppProps {
  grid?: boolean
}

const App = ({ grid }: AppProps) => {
  const party = useTestParty();
  const model = useGraphModel(party);

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
export const GraphShowcase = (options: AppProps) => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App {...options} />
      </ProfileInitializer>
    </ClientProvider>
  );
};
