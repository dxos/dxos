//
// Copyright 2022 DXOS.org
//

import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import yargs from 'yargs';

import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useProfile } from '@dxos/react-client';

import { Menu, PartyList } from './components';

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

// TODO(burdon): ClientProvider, Profile.
// TODO(burdon): Parties view.
// TODO(burdon): Items view.
// TODO(burdon): Invitations.

/**
 * Top-level app with menu.
 */
const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [mode, setMode] = useState<string>();
  const { exit } = useApp();

  // TODO(burdon): Create test profile.
  useAsyncEffect(async () => {
    if (!profile) {
      await client.halo.createProfile();
    }
  }, []);

  useEffect(() => {
    if (mode === 'exit') {
      exit();
    }
  }, [mode]);

  if (!profile) {
    return null;
  }

  switch (mode) {
    case 'exit': {
      return null;
    }

    case 'parties': {
      return (
        <PartyList onExit={() => setMode(undefined)} />
      );
    }

    default: {
      return (
        <Menu
          onSelect={(id: string | null) => setMode(id || 'exit')}
          options={[
            {
              id: 'parties', label: 'View parties'
            },
            {
              id: 'join', label: 'Join party'
            },
            {
              id: 'exit', label: 'Exit'
            }
          ]}
        />
      );
    }
  }
};

/**
 * Command line parser.
 */
const main = () => {
  yargs
    .scriptName('kodama')
    .option('invitation', {
      description: 'Interactive party invitation',
      type: 'string'
    })
    .command({
      command: '*',
      handler: async (argv) => {
        // TODO(burdon): Load config.
        const config = {};

        const { waitUntilExit } = render((
          <ClientProvider config={config}>
            <App />
          </ClientProvider>
        ));

        await waitUntilExit();
        process.exit()
      }
    })
    .help()
    .argv;
};

main();
