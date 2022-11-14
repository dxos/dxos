//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import WrappedTextInput from 'ink-text-input';
import { NotificationCenter } from 'node-notifier';
import process from 'process';
import React, { useEffect, useState } from 'react';

import { useOctokit } from '../hooks';
import { WorkflowTable } from './WorkflowTable';

const notifier = new NotificationCenter({});

export const App = () => {
  const octokit = useOctokit();
  const [first, setFirst] = useState<number>(0);
  const [items, setItems] = useState<any[]>([]);

  const update = async () => {
    const {
      data: { workflow_runs: items = [] }
    } = await octokit.rest.actions.listWorkflowRunsForRepo({
      owner: 'dxos',
      repo: 'dxos'
    });

    setItems(items);
    setFirst(items[0]?.id);
    if (!first) {
      notifier.notify({ title: 'Workflow updated' });
    }
  };

  useEffect(() => {
    const i = setInterval(update, 3000); // TODO(burdon): Back-off.
    void update();

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
