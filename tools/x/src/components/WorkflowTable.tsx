//
// Copyright 2022 DXOS.org
//

/* eslint-disable camelcase */

import chalk from 'chalk';
import columnify from 'columnify';
import { Box, Text } from 'ink';
import React from 'react';

import { relativeTime } from '../util';

const formatPullRequest = (pull_requests?: any) => pull_requests?.[0]?.head.ref ?? '';

export const WorkflowTable = ({ items }: { items: any[] }) => {
  const rows = columnify(
    // TODO(burdon): Calc. elapsed time.
    items.map(({ id, name, display_title, conclusion, pull_requests, updated_at }) => ({
      id: chalk.dim.blue(id),
      name: chalk.gray(name),
      conclusion: !conclusion ? chalk.gray('…') : conclusion === 'success' ? chalk.bold.green('✔') : chalk.red('✗'),
      updated: chalk.blue(relativeTime(Date.parse(updated_at).valueOf())),
      branch: chalk.bold.gray(formatPullRequest(pull_requests)),
      title: chalk.dim.green(display_title),
    })),
    {
      columns: ['id', 'name', 'updated', 'conclusion', 'branch', 'title'],
      truncate: true,
      headingTransform: (str) => str.toLowerCase(),
      config: {
        name: {
          maxWidth: 24,
        },
        updated: {
          align: 'right',
          minWidth: 14,
        },
        conclusion: {
          showHeaders: false,
          minWidth: 4,
        },
        branch: {
          maxWidth: 40,
        },
        title: {
          maxWidth: 40,
        },
      },
    },
  );

  return (
    <Box>
      <Text>{rows}</Text>
    </Box>
  );
};
