//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as introspectTranslations } from '@dxos/react-ui-introspect/translations';

import { meta } from '#meta';

export const translations = [
  ...introspectTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Devtools',
        'open-devtools.label': 'Open DevTools',
        'devtools.label': 'DevTools',
        'devtools-overview.label': 'Stats',
        'debug-app-graph.label': 'App Graph',
        'debug-tools-explorer.label': 'SDK Explorer',

        'reset-data.label': 'Reset data (ERASES ALL DATA)',
        'client.label': 'Client',
        'config.label': 'Config',
        'storage.label': 'Storage',
        'sqlite.label': 'SQLite',
        'logging.label': 'Logging',
        'diagnostics.label': 'Diagnostics',
        'tracing.label': 'Tracing',
        'halo.label': 'HALO',
        'identity.label': 'Identity',
        'devices.label': 'Devices',
        'keyring.label': 'Keyring',
        'credentials.label': 'Credentials',
        'echo.label': 'ECHO',
        'spaces.label': 'Spaces',
        'space.label': 'Space',
        'feeds.label': 'Feeds',
        'objects.label': 'Objects',
        'schema.label': 'Schema',
        'registry.label': 'Registry',
        'automerge.label': 'Automerge',
        'queues.label': 'Queues',
        'members.label': 'Members',
        'metadata.label': 'Metadata',
        'mesh.label': 'MESH',
        'signal.label': 'Signal',
        'swarm.label': 'Swarm',
        'network.label': 'Network',
        'agent.label': 'Agent',
        'dashboard.label': 'Dashboard',
        'search.label': 'Search',
        'edge.label': 'EDGE',
        'workflows.label': 'Workflows',
        'traces.label': 'Traces',
        'testing.label': 'Testing',
        // GitHub (deck-companion--github surface).
        'github-loading.message': 'Loading…',
        'github-unavailable.message': 'GitHub feed unavailable.',
        'recent-prs.label_one': '{{count}} recent PR',
        'recent-prs.label_other': '{{count}} recent PRs',
        'view-on-github.button': 'View on GitHub',
      },
    },
  },
] as const satisfies Resource[];
