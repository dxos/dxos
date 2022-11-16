//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import WrappedTextInput from 'ink-text-input';
import { NotificationCenter } from 'node-notifier';
import process from 'process';
import React, { FC, useEffect, useState } from 'react';

import { useOctokit } from '../hooks';
import { WorkflowTable } from './WorkflowTable';

// TODO(burdon): Call on state change.
const notifier = new NotificationCenter({});

export const App: FC<{ owner: string; repo: string }> = ({ owner, repo }) => {
  const octokit = useOctokit();
  const [items, setItems] = useState<any[]>([]);

  const update = async () => {
    // https://octokit.github.io/rest.js/v19#actions-download-workflow-run-attempt-logs
    const {
      data: { workflow_runs: items = [] }
    } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo });

    setItems(items);
  };

  useEffect(() => {
    void update();
    const i = setInterval(update, 3000); // TODO(burdon): Back-off.
    return () => clearInterval(i);
  }, []);

  return (
    <Box display='flex' flexDirection='column'>
      <WorkflowTable items={items} />
      <Box marginBottom={1} />
      <WrappedTextInput
        focus={true}
        showCursor={true}
        value=''
        onChange={() => {}}
        onSubmit={() => {
          process.exit();
        }}
      />
    </Box>
  );
};
