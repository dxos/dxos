//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { get } from 'https';
import { Box } from 'ink';
import WrappedTextInput from 'ink-text-input';
import { NotificationCenter } from 'node-notifier';
import process from 'process';
import React, { FC, useEffect, useRef, useState } from 'react';
import unzip from 'unzip-stream';

import { useOctokit } from '../hooks';
import { WorkflowTable } from './WorkflowTable';

const notifier = new NotificationCenter({});

export const App: FC<{ owner: string; repo: string }> = ({ owner, repo }) => {
  const octokit = useOctokit();
  const idRef = useRef<number>(0);
  const [items, setItems] = useState<any[]>([]);

  const update = async () => {
    // https://octokit.github.io/rest.js/v19#actions-download-workflow-run-attempt-logs
    const {
      data: { workflow_runs: items = [] }
    } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo });

    // status, conclusion
    // if (!idRef.current) {
    if (items[0]) {
      // console.log(items[3]);
      // const { name, run_number: jobId, conclusion } = items[0];
      // console.log('>>>>>>>>>>', jobId);

      // https://docs.github.com/en/rest/actions/workflow-runs#download-workflow-run-logs
      const { url } = await octokit.rest.actions.downloadWorkflowRunLogs({
        accept: 'application/vnd.github+json',
        owner,
        repo,
        run_id: 3465435690
      });

      get(url, (response) => {
        assert(response.statusCode === 200);

        // TODO(burdon): zlib directly doesn't work. Z_DATA_ERROR
        // https://nodejs.org/api/zlib.html
        // https://www.npmjs.com/package/tar-stream

        // https://www.npmjs.com/package/unzip-stream#quick-examples
        // response.pipe(unzip.Extract({ path: '/tmp/dxos/workflow.zip' }));
        response
          .pipe(unzip.Parse())
          .on('entry', (entry: any) => {
            // TODO(burdon): Scan for errors?
            console.log('=', entry.path);
          })
          .on('end', () => {
            process.exit();
          });
      });

      // https://github.com/mikaelbr/node-notifier#all-notification-options-with-their-defaults
      // notifier.notify({ title: 'Workflow updated', message: `${name}:${conclusion}` });
    }

    setItems(items);
    // idRef.current = items[0]?.id;
  };

  useEffect(() => {
    const i = 0;
    // const i = setInterval(update, 3000); // TODO(burdon): Back-off.
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
