//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Icon, Input, Panel, Toolbar, useFileDownload } from '@dxos/react-ui';

import { JsonView, Tree } from '../../../components';

export const DiagnosticsPanel = () => {
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

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <Panel.Root classNames='bs-full'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.Checkbox checked={recording} onCheckedChange={(recording) => handleSetRecording(!!recording)} />
            <Input.Label>Record metrics</Input.Label>
          </Input.Root>
          <div className='grow' />
          <Toolbar.Button onClick={handleRefresh}>Run Diagnostics</Toolbar.Button>
          <Toolbar.IconButton icon='ph--download--regular' label='Download diagnostics' onClick={handleDownload} />
          <Toolbar.Button onClick={handleResetMetrics}>Reset metrics</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='overflow-auto'>
        {(true && <JsonView data={data} />) || <Tree data={data} />}
      </Panel.Content>
      {info && (
        <Panel.Statusbar asChild>
          <div className='flex p-2 items-center text-sm font-mono gap-2'>
            {info.map((text, i) => (
              <button
                key={i}
                className='inline-flex items-center gap-1 cursor-pointer'
                onClick={() => handleCopy(text)}
              >
                <Icon icon='ph--clipboard-text--regular' />
                {text}
              </button>
            ))}
          </div>
        </Panel.Statusbar>
      )}
    </Panel.Root>
  );
};
