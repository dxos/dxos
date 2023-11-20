//
// Copyright 2023 DXOS.org
//

import { Octokit } from '@octokit/rest';

import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

// TODO(mykola): Mock Octokit. Unskip tests.
describe.skip('Octokit', () => {
  test('Parse human profile', async () => {
    const octokit = new Octokit();
    const username = 'mykola-vrmchk';
    const response = await octokit.users.getByUsername({
      username,
    });

    const userData = response.data;
    log.info('userData', { userData });
  });

  test('Parse project', async () => {
    const octokit = new Octokit();
    // const PROJECT = 'https://github.com/dxos/dxos';
    const response = await octokit.repos.get({ owner: 'dxos', repo: 'dxos' });
    const repoData = response.data;
    log.info('repoData', { repoData });
  });

  test('Parse contributors', async () => {
    const octokit = new Octokit();
    const response = await octokit.repos.listContributors({ owner: 'dxos', repo: 'dxos' });
    const contributors = response.data;
    log.info('contributors', { contributors });
  });
});
