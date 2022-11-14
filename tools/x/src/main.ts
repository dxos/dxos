//
// Copyright 2022 DXOS.org
//

import { Octokit } from '@octokit/rest';

// TODO(burdon): See `@dxos/mission-control`.
// https://octokit.github.io/rest.js/v19

// https://github.com/settings/tokens
// https://github.com/settings/tokens/1020021638
// TODO(burdon): Interactive OAuth: https://github.com/octokit/auth-app.js/#authenticate-as-user
const config = {
  token: {
    id: '1020021638',
    value: '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'
  }
};

// TODO(burdon): Start of tool to monitor/log workflows.
const main = async () => {
  const octokit = new Octokit({
    auth: config.token.value
  });

  const { data } = await octokit.rest.pulls.list({
    owner: 'dxos',
    repo: 'dxos'
  });

  // TODO(burdon): Projection tool.
  const output = data.map(({ title, user }) => ({
    title,
    user: user?.login
  }));

  console.log(JSON.stringify(output, undefined, 2));
};

// TODO(burdon): Yargs.
void main();
