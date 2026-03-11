//
// Copyright 2025 DXOS.org
//

import { DownloadIcon } from '@storybook/icons';
import React, { useCallback } from 'react';
import { IconButton } from 'storybook/internal/components';
import { addons, types } from 'storybook/manager-api';

import { ADDON_ID, DOWNLOAD_EVENT, LOGS_DATA_EVENT, TOOL_ID } from './constants';

const triggerDownload = (ndjson: string) => {
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `storybook-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const DownloadLogsButton = () => {
  const channel = addons.getChannel();

  const handleClick = useCallback(() => {
    channel.once(LOGS_DATA_EVENT, ({ ndjson }: { ndjson: string }) => {
      triggerDownload(ndjson);
    });
    channel.emit(DOWNLOAD_EVENT);
  }, [channel]);

  return (
    <IconButton title='Download logs' onClick={handleClick}>
      <DownloadIcon />
    </IconButton>
  );
};

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Download logs',
    render: () => <DownloadLogsButton />,
  });
});
