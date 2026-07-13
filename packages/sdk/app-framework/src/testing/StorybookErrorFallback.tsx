//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ErrorFallback, type FallbackProps } from '@dxos/react-error-boundary';
import { downloadLogs } from '@dxos/storybook-addon-logger/download';

/**
 * Default `ErrorBoundary` fallback for storybook-hosted apps (`withPluginManager`/`useApp`). Adds
 * a "Download logs" action alongside the theme-independent default `ErrorFallback`, so a crashed
 * story still offers a one-click way to grab the story's buffered logs, matching the manager
 * toolbar's button (see `@dxos/storybook-addon-logger`).
 *
 * Deliberately does NOT depend on `@dxos/react-ui`'s themed components: `useApp`'s `ErrorBoundary`
 * can catch failures that happen before/during an app's own theme setup, so its fallback must keep
 * working even when no theme context is available — the same reason `ErrorFallback` itself uses
 * inline styles rather than Tailwind/theme dependencies.
 */
export const StorybookErrorFallback = (props: FallbackProps) => (
  <div>
    <ErrorFallback {...props} />
    <button
      type='button'
      onClick={downloadLogs}
      style={{
        margin: '0 1rem 1rem',
        padding: '0.25rem 0.75rem',
        fontSize: '0.875rem',
        background: 'transparent',
        border: '1px solid #888888',
        borderRadius: '0.375rem',
        cursor: 'pointer',
      }}
    >
      Download logs
    </button>
  </div>
);
