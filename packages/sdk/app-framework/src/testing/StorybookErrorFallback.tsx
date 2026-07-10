//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type FallbackProps } from '@dxos/react-error-boundary';
import { ErrorFallback, IconButton } from '@dxos/react-ui';
import { downloadLogs } from '@dxos/storybook-addon-logger/download';

/**
 * Default `ErrorBoundary` fallback for storybook-hosted apps (`withPluginManager`/`useApp`). Adds
 * a "Download logs" action to the themed `ErrorFallback` so a crashed story still offers a
 * one-click way to grab the story's buffered logs, matching the manager toolbar's button (see
 * `@dxos/storybook-addon-logger`).
 */
export const StorybookErrorFallback = (props: FallbackProps) => (
  <ErrorFallback {...props}>
    <IconButton
      classNames='text-xs uppercase'
      label='Download logs'
      icon='ph--download-simple--regular'
      size={5}
      onClick={downloadLogs}
    />
  </ErrorFallback>
);
