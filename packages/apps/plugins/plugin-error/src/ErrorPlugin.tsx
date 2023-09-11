//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Config, Defaults, Envs, Local } from '@dxos/react-client';
import { ErrorBoundary, PluginDefinition } from '@dxos/react-surface';

import { ResetDialog } from './components';

// TODO(wittjosiah): This is probably too naive and probably needs to be better integrated with the framework.
//   For example, if client fails to initialize during plugin initialization and then the client plugin is missing,
//   how is this reflected in the UI?
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
