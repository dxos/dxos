//
// Copyright 2025 DXOS.org
//

import { DownloadIcon } from '@storybook/icons';
import React, { useCallback } from 'react';
import { Button } from 'storybook/internal/components';
import { addons, types } from 'storybook/manager-api';

import { ADDON_ID, DOWNLOAD_EVENT, LOGS_DATA_EVENT, TOOL_ID } from './constants';
import { triggerLogsDownload } from './trigger-download';

const DownloadLogsButton = () => {
  const channel = addons.getChannel();

  const handleClick = useCallback(() => {
    channel.once(LOGS_DATA_EVENT, ({ ndjson }: { ndjson: string }) => {
      triggerLogsDownload(ndjson);
    });
    channel.emit(DOWNLOAD_EVENT);
  }, [channel]);

  return (
    <Button variant='ghost' padding='small' ariaLabel='Download logs' onClick={handleClick}>
      <DownloadIcon />
    </Button>
  );
};

addons.register(ADDON_ID, () => {
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Download logs',
    render: () => <DownloadLogsButton />,
  });
});
