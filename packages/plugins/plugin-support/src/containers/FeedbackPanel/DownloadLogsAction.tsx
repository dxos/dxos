//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { ObservabilityCapabilities } from '@dxos/plugin-observability';

import { FeedbackForm } from '#components';

/**
 * Resolves the optional `LogDownloader` capability and renders the "Download logs" affordance.
 * Renders nothing when no downloader is contributed.
 */
export const DownloadLogsAction = () => {
  const [onDownloadLogs] = useCapabilities(ObservabilityCapabilities.LogDownloader);
  return <FeedbackForm.DownloadLogs onDownloadLogs={onDownloadLogs} />;
};

DownloadLogsAction.displayName = 'DownloadLogsAction';
