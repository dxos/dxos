//
// Copyright 2023 DXOS.org
//

import { Download } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Button, Input } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { useFileDownload } from '@dxos/react-appkit';
import { useAsyncEffect } from '@dxos/react-async';
import { useClient } from '@dxos/react-client';

import { JsonView, PanelContainer, Toolbar } from '../../components';

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

  return (
    <PanelContainer
      toolbar={
        <Toolbar>
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleDownload}>
            <Download className={getSize(5)} />
            <span className='m-2'>Download</span>
          </Button>
          <Button onClick={handleResetMetrics}>Reset metrics</Button>
          <div className='flex'>
            <Input.Root>
              <Input.Checkbox checked={recording} onCheckedChange={(recording) => handleSetRecording(!!recording)} />
              <span className='px-2.5 pt-0.5 text-sm whitespace-nowrap'>Record metrics</span>
            </Input.Root>
          </div>
        </Toolbar>
      }
    >
      <JsonView data={data} level={5} />
    </PanelContainer>
  );
};

export default DiagnosticsPanel;
