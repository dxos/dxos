//
// Copyright 2023 DXOS.org
//

import { ClipboardText, Download } from '@phosphor-icons/react';
import React, { useMemo, useState } from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';
import { Input, Toolbar, useFileDownload } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { JsonView, PanelContainer, Tree } from '../../../components';

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
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Input.Root>
            <Input.Checkbox checked={recording} onCheckedChange={(recording) => handleSetRecording(!!recording)} />
            <Input.Label>Record metrics</Input.Label>
          </Input.Root>
          <div className='grow' />
          <Toolbar.Button onClick={handleRefresh}>Run Diagnostics</Toolbar.Button>
          <Toolbar.Button onClick={handleDownload}>
            <Download className={getSize(5)} />
          </Toolbar.Button>
          <Toolbar.Button onClick={handleResetMetrics}>Reset metrics</Toolbar.Button>
        </Toolbar.Root>
      }
      footer={
        info && (
          <div className='flex p-2 items-center text-sm font-mono gap-2'>
            {info.map((text, i) => (
              <div key={i} className='inline-flex items-center gap-1 cursor-pointer' onClick={() => handleCopy(text)}>
                <ClipboardText />
                {text}
              </div>
            ))}
          </div>
        )
      }
    >
      {(true && <JsonView data={data} />) || <Tree data={data} />}
    </PanelContainer>
  );
};
