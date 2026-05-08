//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Registry',
        'details.label': 'Details',
        'home-page.label': 'Website',
        'source.label': 'Source',
        'plugin-registry.label': 'Plugins',
        'plugin-settings.label': 'Plugin Settings',
        'official-plugins.label': 'Official',
        'installed-plugins.label': 'Enabled',
        'recommended-plugins.label': 'Recommended',
        'labs-plugins.label': 'Labs',
        'registry-plugins.label': 'Registry',
        'load-by-url.label': 'Load from URL',
        'load-by-url-dialog.title': 'Load Plugin from URL',
        'plugin-url.label': 'Plugin URL',
        'load-plugin.label': 'Load Plugin',
        'load-dev-plugin.label': 'Load Dev Plugin',
        'loading.label': 'Loading...',
        'coming-soon.label': 'Coming soon!',
        'open-plugin-registry.label': 'Open plugin registry',
        'install.label': 'Install',
        'installing.label': 'Installing…',
        'uninstall.label': 'Uninstall',
        'update.label': 'Update',
        'updating.label': 'Updating…',
        'versions.label': 'Versions',
        'installed.label': 'installed',
        'install-version.label': 'Install version',
        'failure-badge.label': 'Plugin failure details',
        'failure-title.label': 'Plugin {{phase}} failed: {{reason}}',
        'failure-phase-load.label': 'load',
        'failure-phase-activation.label': 'activation',
        'failure-reason-timeout.label': 'timed out',
        'failure-reason-error.label': 'error',
      },
    },
  },
] as const satisfies Resource[];
