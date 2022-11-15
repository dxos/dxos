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

const config = {
  // https://github.com/settings/tokens
  github: {
    token: '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'
  },
  // TODO(burdon): User vs project tokens.
  //  https://discuss.circleci.com/t/circle-token-param-ignored-when-using-api-url-to-fetch-latest-artifact/3197/10
  // https://app.circleci.com/settings/user/tokens
  // https://app.circleci.com/settings/project/github/dxos/dxos/api
  circleci: {
    token: 'f127965433d3a73578004f8bca9490a8e6ad0ba2'
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
  // TODO(burdon): Interactive OAuth: https://github.com/octokit/auth-app.js/#authenticate-as-user
  const octokit = new Octokit({
    auth: config.github.token
  });

  clear();

  // circleci.getBuilds({ username: 'dxos', project: 'dxos' }).then((builds: any[]) => {
  //   console.log('>>>>>>>>', builds);
  //   for (let i = 0; i < builds.length; i++) {
  //     console.log(builds[i].build_num); // logs the build number for each project
  //   }
  // });

  if (false) {
    const { waitUntilExit } = render(
      <OctokitContext.Provider value={octokit}>
        <App owner='dxos' repo='dxos' />
      </OctokitContext.Provider>
    );

    await waitUntilExit();
  }
};

void start();
