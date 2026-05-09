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
        'loading.label': 'Loading...',
        'dev-plugin.section.title': 'Dev plugin',
        'dev-plugin.description':
          'Load a plugin from a local Vite dev server (the `composerPlugin` defaults to port 3967). Composer reattaches it on every reload, surviving HMR — useful when iterating on a community plugin against a live registry version.',
        'dev-plugin.url.label': 'Manifest URL',
        'dev-plugin.url.description':
          'Defaults to the local dev server. Edit if your dev server runs on a different port.',
        'dev-plugin.toggle.label': 'Dev plugin',
        'dev-plugin.toggle.description':
          'Stays on across reloads. If the dev server is offline at boot, a warning is logged and the next reload retries.',
        'dev-plugin.enable.label': 'Enable',
        'dev-plugin.disable.label': 'Disable',
        'dev-plugin.busy.label': 'Loading…',
        'dev-plugin.not-loaded.message':
          'Dev plugin is enabled but not currently loaded. Check that the dev server is running, then reload.',
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
