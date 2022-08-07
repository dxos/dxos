//
// Copyright 2022 DXOS.org
//

import { Box, Text, render } from 'ink';
import React, { FC } from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

import { App } from './components';
import { AppStateProvider } from './hooks';

const VersionUpdate: FC<{ name: string, version: string }> = ({ name, version }) => {
  return (
    <Box
      flexDirection='column'
      margin={1}
      padding={1}
      borderStyle='double'
      borderColor='red'
    >
      <Text>
        New version: {version}
      </Text>
      <Text>
        Update: <Text color='yellow'>npm -g up {name}</Text> or <Text color='yellow'>yarn global upgrade {name}</Text>
      </Text>
    </Box>
  );
};

export interface Options {
  debug?: boolean
  update?: {
    name: string
    version: string
  }
}

export const start = async (client: Client, options: Options = {}) => {
  const { debug, update } = options;

  const { waitUntilExit } = render((
    <ClientProvider client={client}>
      {update && (
        <VersionUpdate name={update.name} version={update.version} />
      )}

      <AppStateProvider debug={debug}>
        <App />
      </AppStateProvider>
    </ClientProvider>
  ));

  await waitUntilExit();
};
