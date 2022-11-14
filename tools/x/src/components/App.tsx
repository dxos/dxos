//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import WrappedTextInput from 'ink-text-input';
import { NotificationCenter } from 'node-notifier';
import process from 'process';
import React, { FC, useEffect, useRef, useState } from 'react';

import { useOctokit } from '../hooks';
import { WorkflowTable } from './WorkflowTable';

const notifier = new NotificationCenter({});

export const App: FC<{ owner: string; repo: string }> = ({ owner, repo }) => {
  const octokit = useOctokit();
  const idRef = useRef<number>(0);
  const [items, setItems] = useState<any[]>([]);

  const update = async () => {
    const {
      data: { workflow_runs: items = [] }
    } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo });

    if (!idRef.current) {
      const { name, conclusion } = items[0];

      // https://github.com/mikaelbr/node-notifier#all-notification-options-with-their-defaults
      notifier.notify({ title: 'Workflow updated', message: `${name}:${conclusion}` });
    }

    setItems(items);
    idRef.current = items[0]?.id;
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
