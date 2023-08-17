//
// Copyright 2023 DXOS.org
//

import { Clipboard, Download } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import { Input, Toolbar } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useFileDownload } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

import { JsonView, PanelContainer } from '../../components';

const DiagnosticsPanel = () => {
  const client = useClient();
  const [data, setData] = useState({});
  useEffect(() => {
    void handleRefresh();
  }, []);
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
          <Toolbar.Button onClick={handleRefresh}>Refresh</Toolbar.Button>
          <Toolbar.Button onClick={handleDownload}>
            <Download className={getSize(5)} />
            <span className='m-2'>Download</span>
          </Toolbar.Button>
          <Toolbar.Button onClick={handleResetMetrics}>Reset metrics</Toolbar.Button>
          <Input.Root>
            <Input.Checkbox checked={recording} onCheckedChange={(recording) => handleSetRecording(!!recording)} />
            <Input.Label>Record metrics</Input.Label>
          </Input.Root>
        </Toolbar.Root>
      }
      footer={
        info && (
          <div className='flex p-2 items-center text-sm font-mono gap-2'>
            {info.map((text, i) => (
              <div key={i} className='inline-flex items-center gap-1 cursor-pointer' onClick={() => handleCopy(text)}>
                <Clipboard />
                {text}
              </div>
            ))}
          </div>
        )
      }
    >
      <JsonView data={data} level={5} />
    </PanelContainer>
  );
};

export default DiagnosticsPanel;
