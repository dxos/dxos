//
// Copyright 2022 DXOS.org
//

/* eslint-disable camelcase */

import chalk from 'chalk';
import columnify from 'columnify';
import { Box, Text } from 'ink';
import React from 'react';

import { relativeTime } from '../util';

const formatPullRequest = (pull_requests?: any) => {
  return pull_requests?.[0]?.head.ref;
};

export const WorkflowTable = ({ items }: { items: any[] }) => {
  const rows = columnify(
    items.map(({ id, name, display_title, run_number, conclusion, pull_requests, updated_at, logs_url }) => ({
      id: chalk.dim.blue(id),
      name: chalk.gray(name),
      conclusion: !conclusion ? chalk.gray('…') : conclusion === 'success' ? chalk.bold.green('✔') : chalk.red('✗'),
      updated: chalk.blue(relativeTime(Date.parse(updated_at).valueOf())),
      branch: chalk.bold.gray(formatPullRequest(pull_requests)),
      title: chalk.dim.green(display_title)
    })),
    {
      columns: ['id', 'name', 'updated', 'conclusion', 'branch', 'title'],
      truncate: true,
      headingTransform: (str) => str.toLowerCase(),
      config: {
        name: {
          maxWidth: 20
        },
        updated: {
          align: 'right',
          minWidth: 14
        },
        conclusion: {
          showHeaders: false,
          minWidth: 4
        },
        branch: {
          maxWidth: 32
        },
        title: {
          maxWidth: 32
        }
      }
    }
  );

  return (
    <Box>
      <Text>{rows}</Text>
    </Box>
  );
};
