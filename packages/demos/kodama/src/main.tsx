//
// Copyright 2022 DXOS.org
//

import { render, useApp } from 'ink';
import React, { useEffect, useState } from 'react';
import yargs from 'yargs';

import { List, Menu } from './components';

// TODO(burdon): Rename "echo"

// Note: nodemon interferes with input.
// https://github.com/remy/nodemon/issues/2050

// https://www.npmjs.com/package/ink
// TODO(burdon): https://github.com/privatenumber/ink-task-list

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
        <List onExit={() => setMode(undefined)} />
      );
    }

    default: {
      return (
        <Menu
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

          onSelect={(id: string | null) => {
            setMode(id || 'exit');
          }}
        />
      );
    }
  }
}

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
