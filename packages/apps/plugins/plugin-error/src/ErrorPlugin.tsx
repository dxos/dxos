//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ErrorBoundary, type PluginDefinition, type TranslationsProvides } from '@dxos/app-framework';
import { Config, Defaults, Envs, Local } from '@dxos/react-client';

import { ResetDialog } from './components';
import meta from './meta';
import translations from './translations';

// TODO(wittjosiah): This is probably too naive and probably needs to be better integrated with the framework.
//   For example, if client fails to initialize during plugin initialization and then the client plugin is missing,
//   how is this reflected in the UI?
// TODO(wittjosiah): Factor out to @dxos/app-framework & include in plugin set automatically.
export const ErrorPlugin = (
  { config }: { config: Config } = { config: new Config(Envs(), Local(), Defaults()) },
): PluginDefinition<TranslationsProvides> => ({
  meta,
  provides: {
    translations,
    context: ({ children }) => (
      <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={config} />}>{children}</ErrorBoundary>
    ),
  },
});
