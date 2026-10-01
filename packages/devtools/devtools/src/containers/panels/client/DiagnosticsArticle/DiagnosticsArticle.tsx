//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { useFileDownload } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { JsonView } from '../../../../components/index.ts';
import { type ArticleProps } from '../../types.ts';

export const DiagnosticsArticle = ({ role }: ArticleProps) => {
  const client = useClient();
  const [data, setData] = useState({});
  const handleRefresh = async () => {
    try {
      setData({ status: 'Pending...' });
      const data = await client.diagnostics({ humanize: false, truncate: true });
      setData(data);
    } catch (err: any) {
      setData({ status: err.message });
    }
  };

  const [recording, setRecording] = useState(false);
  useAsyncEffect(async () => {
    const { recording = false } = await client.services.services.LoggingService!.controlMetrics({});
    setRecording(recording);
  }, [client]);
  const handleSetRecording = async (record: boolean) => {
    const { recording = false } = await client.services.services.LoggingService!.controlMetrics({ record });
    setRecording(recording);
  };
  const handleResetMetrics = async () => {
    const { recording = false } = await client.services.services.LoggingService!.controlMetrics({ reset: true });
    setRecording(recording);
    await handleRefresh();
  };

  const fileDownload = useFileDownload();
  const handleDownload = async () => {
    fileDownload(
      new Blob([JSON.stringify(data, undefined, 2)], { type: 'text/plain' }),
      `${new Date().toISOString().replace(/\W/g, '-')}.json`,
    );
  };

  const info = useMemo<string[] | undefined>(() => {
    if ((window as any).chrome) {
      return ['chrome://inspect/#workers'];
    }
  }, []);

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <Next.Checkbox
            checked={recording}
            onCheckedChange={({ checked: recording }) => handleSetRecording(!!recording)}
            label='Record metrics'
          />
          <div className='grow' />
          <Next.Button onClick={handleRefresh}>Run Diagnostics</Next.Button>
          <Next.Button icon='ph--download--regular' label='Download diagnostics' onClick={handleDownload} />
          <Next.Button onClick={handleResetMetrics}>Reset metrics</Next.Button>
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body>
        <JsonView data={data} />
      </Next.Panel.Body>
      {info && (
        <Next.Panel.Footer>
          <div className='flex p-2 items-center text-sm font-mono gap-2'>
            {info.map((text) => (
              <Next.SystemButton.Clipboard key={text} variant='ghost' label={text} value={text} />
            ))}
          </div>
        </Next.Panel.Footer>
      )}
    </Next.Panel.Root>
  );
};
