//
// Copyright 2022 DXOS.org
//

import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import yargs from 'yargs';

import { PartyKey } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient, useProfile } from '@dxos/react-client';

import { JoinParty, Menu, PartyList } from './components';

// TODO(burdon): Lint issue.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// import config from './config.yml';
const config = {
  runtime: {
    services: {
      ipfs: {
        server: 'https://ipfs-pub1.kube.dxos.network'
      },
      signal: {
        server: 'wss://demo.kube.dxos.network/dxos/signal'
      },
      ice: [
        {
          urls: 'turn:demo.kube.dxos.network:3478',
          username: 'dxos',
          credential: 'dxos'
        }
      ]
    }
  }
};

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

/**
 * Top-level app with menu.
 */
const App = () => {
  const client = useClient();
  const profile = useProfile();
  const [mode, setMode] = useState<string>(); // TODO(burdon): Enum.
  const [partyKey, setPartyKey] = useState<PartyKey>();
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

    case 'join': {
      return (
        <JoinParty
          onExit={(partyKey?: PartyKey) => {
            setPartyKey(partyKey);
            setMode(partyKey ? 'parties' : undefined);
          }}
        />
      );
    }

    case 'parties': {
      return (
        <PartyList
          partyKey={partyKey}
          onExit={() => {
            setPartyKey(undefined);
            setMode(undefined)
          }}
        />
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
