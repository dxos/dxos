//
// Copyright 2022 DXOS.org
//

/* eslint-disable camelcase */

import { Octokit } from '@octokit/rest';
import chalk from 'chalk';
import columnify from 'columnify';
import { NotificationCenter } from 'node-notifier';

import { relativeTime } from './util';

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

const notifier = new NotificationCenter({});

const formatPullRequest = (pull_requests?: any) => {
  return pull_requests?.[0]?.head.ref;
};

const main = async () => {
  // https://octokit.github.io/rest.js/v19
  const octokit = new Octokit({
    auth: config.token.value
  });

  const {
    data: { workflow_runs }
  } = await octokit.rest.actions.listWorkflowRunsForRepo({
    owner: 'dxos',
    repo: 'dxos'
  });

  const rows = columnify(
    workflow_runs.map(
      ({
        id,
        name,
        display_title,
        run_number,
        status,
        conclusion,
        pull_requests,
        created_at,
        updated_at,
        run_started_at,
        logs_url
      }) => ({
        id: chalk.blue(id),
        name: chalk.gray(name),
        status: status === 'completed' ? '' : chalk.blue('…'),
        conclusion: conclusion === 'success' ? chalk.green('✔') : chalk.red('✗'),
        updated_at: relativeTime(Date.parse(updated_at).valueOf()),
        pull_requests: chalk.gray(formatPullRequest(pull_requests))
      })
    ),
    {
      columns: ['id', 'status', 'name', 'updated_at', 'conclusion', 'pull_requests'],
      truncate: true,
      config: {
        name: {
          maxWidth: 20
        },
        status: {
          align: 'right',
          showHeaders: false,
          minWidth: 2
        },
        conclusion: {
          showHeaders: false,
          minWidth: 4
        },
        branch: {
          maxWidth: 32
        },
        pull_requests: {
          maxWidth: 32
        },
        updated_at: {
          align: 'right',
          minWidth: 14,
          headingTransform: () => 'Updated'
        }
      }
    }
  );

  console.log(rows);

  // NOTE: Check notifications are not silenced.
  // await notifier.notify({ title: 'test', message: 'hello', timeout: 3 }, () => {
  //   console.log(JSON.stringify(output, undefined, 2));
  // });
};

// TODO(burdon): Yargs.
void main();
