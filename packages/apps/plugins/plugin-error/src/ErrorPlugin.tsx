//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';

import { Config, Defaults, Envs, Local } from '@dxos/config';
import { ResetDialog } from '@dxos/react-appkit';
import { PluginDefinition } from '@dxos/react-surface';

export const ErrorPlugin = (
  { config }: { config: Config } = { config: new Config(Envs(), Local(), Defaults()) },
): PluginDefinition => ({
  meta: {
    id: 'dxos.org/plugin/error',
  },
  provides: {
    context: ({ children }) => (
      <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={config} />}>{children}</ErrorBoundary>
    ),
  },
});
