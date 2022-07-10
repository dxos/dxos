//
// Copyright 2022 DXOS.org
//

import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import yargs from 'yargs';

import { Menu, PartyList } from './components';

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050
// https://www.npmjs.com/package/ink

// TODO(burdon): Profile.
// TODO(burdon): Parties view.
// TODO(burdon): Items view.
// TODO(burdon): Invitations.

/**
 * Top-level app with menu.
 */
const App = () => {
  const [mode, setMode] = useState<string>();
  const { exit } = useApp();

  useEffect(() => {
    if (mode === 'exit') {
      exit();
    }
  }, [mode]);

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
}

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
      handler: (argv) => {
        render(<App />);
      }
    })
    .help()
    .argv;
};

main();
