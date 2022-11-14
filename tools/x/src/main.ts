//
// Copyright 2022 DXOS.org
//

import { Octokit } from '@octokit/rest';
import growl from 'growl';

// TODO(burdon): Start of tool to monitor/log workflows.
// TODO(burdon): Growl when completes and show log on error.
//  https://www.npmjs.com/package/growl
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

const main = async () => {
  // https://octokit.github.io/rest.js/v19
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
  growl('ok');
};

// TODO(burdon): Yargs.
void main();
