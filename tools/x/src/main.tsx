//
// Copyright 2022 DXOS.org
//

/* eslint-disable camelcase */

import { Octokit } from '@octokit/rest';
import { render } from 'ink';
import process from 'process';
import React from 'react';

import { App } from './components';
import { OctokitContext } from './hooks';

// TODO(burdon): Start of tool to monitor/log workflows.
// TODO(burdon): See `@dxos/mission-control`.

// https://github.com/settings/tokens
// https://github.com/settings/tokens/1020021638
// TODO(burdon): Interactive OAuth: https://github.com/octokit/auth-app.js/#authenticate-as-user
const config = {
  token: {
    id: '1020021638',
    value: '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'
  }
};

/**
 * Clear terminal.
 */
export const clear = () => {
  process.stdout.write(process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H');
};

// TODO(burdon): Yargs.
// void main();

const start = async () => {
  // https://octokit.github.io/rest.js/v19
  const octokit = new Octokit({
    auth: config.token.value
  });

  clear();
  const { waitUntilExit } = render(
    <OctokitContext.Provider value={octokit}>
      <App owner='dxos' repo='dxos' />
    </OctokitContext.Provider>
  );

  await waitUntilExit();
};

void start();
