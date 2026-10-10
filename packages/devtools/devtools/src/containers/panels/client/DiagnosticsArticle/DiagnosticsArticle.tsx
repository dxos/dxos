//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useAsyncEffect } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Panel from '@dxos/react-ui/Panel';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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

  const fileDownload = Hooks.useFileDownload();
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
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <Input.Checkbox
            checked={recording}
            onCheckedChange={({ checked: recording }) => handleSetRecording(!!recording)}
            label='Record metrics'
          />
          <div className='grow' />
          <Button.Root onClick={handleRefresh}>Run Diagnostics</Button.Root>
          <Button.Root icon='ph--download--regular' label='Download diagnostics' onClick={handleDownload} />
          <Button.Root onClick={handleResetMetrics}>Reset metrics</Button.Root>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body>
        <JsonView data={data} />
      </Panel.Body>
      {info && (
        <Panel.Footer>
          <div className='flex p-2 items-center text-sm font-mono gap-2'>
            {info.map((text) => (
              <SystemButton.Clipboard key={text} variant='ghost' label={text} value={text} />
            ))}
          </div>
        </Panel.Footer>
      )}
    </Panel.Root>
  );
};
