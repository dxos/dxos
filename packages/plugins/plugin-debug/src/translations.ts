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
        'plugin.name': 'Debug',
        'settings.title': 'Debug settings',
        'open-devtools.label': 'Open DevTools',
        'devtools.label': 'DevTools',
        'devtools-overview.label': 'Stats',
        'space-objects.label': 'Database',
        'debug.label': 'Debug',
        'generate-objects.label': 'Generate Objects',
        'debug-app-graph.label': 'App Graph',
        'debug-tools-explorer.label': 'SDK Explorer',

        'settings.enable-edge-admin.label': 'Enable edge admin.',
        'settings.enable-edge-admin.description':
          'Show the Hub Admin section in DevTools and allow configuring an Edge admin API key via Integrations.',
        'settings.wireframe.label': 'Show wireframes.',
        'settings.wireframe.description': 'Overlay wireframe outlines on UI components for debugging layout.',
        'settings.trace-all.label': 'Trace all requests (100% sampling).',
        'settings.trace-all.description':
          'Override the default 30% sampling rate to capture all traces. Requires page reload to take effect.',
        'settings.tracing-panel.label': 'Open tracing panel.',
        'settings.tracing-panel.description': 'Open the tracing dashboard to inspect captured spans.',
        'settings.repair.label': 'Run repair tool.',
        'settings.repair.description': 'Attempt to detect and fix inconsistencies in local data storage.',
        'settings.download-diagnostics.label': 'Download diagnostics.',
        'settings.download-diagnostics.description':
          'Export a JSON file containing client diagnostics for troubleshooting.',
        'settings.download-logs.label': 'Download log buffer.',
        'settings.download-logs.description': 'Export the in-memory log buffer as an NDJSON file.',
        'settings.uploaded.message': 'Settings uploaded.',
        'settings.uploaded.description': 'URL copied to clipboard.',
        'settings.choose-storage-adaptor.label': 'Storage adaptor (worker reload required).',
        'settings.choose-storage-adaptor.description':
          'Select the browser storage backend. Changing this requires a worker reload and may make existing data unavailable.',
        'settings.repair-success.message': 'Repair succeeded',
        'settings.repair-failed.message': 'Repair failed',

        'settings.storage-adaptor.idb.label': 'IndexedDB',
        'settings.storage-adaptor.opfs.label': 'OPFS',
        'settings.storage-adapter.changed-alert.message':
          'Warning: Swapping the storage adapter will make your data unavailable.',

        'settings.data-store.label': 'Data Store',

        'reset-data.label': 'Reset data (ERASES ALL DATA)',
        'open-debug-panel.label': 'Show Debug',
        'client.label': 'Client',
        'config.label': 'Config',
        'storage.label': 'Storage',
        'sqlite.label': 'SQLite',
        'logs.label': 'Logs',
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
        'hub-admin.label': 'Hub Admin',
        'hub-admin.accounts.label': 'Accounts',
        'hub-admin.codes.label': 'Invitation Codes',
        'hub-admin.waitlist.label': 'Waitlist',
        'hub-admin.magic-links.label': 'Magic Links',
        'hub-admin.edge.label': 'Edge',
        'hub-admin.spaces.label': 'Spaces',
        'hub-admin.identities.label': 'Identities',
        'hub-admin.messages.label': 'Messages',
        'hub-admin.email.label': 'Send Email',
        'hub-admin.services.label': 'Services',
        'hub-admin.templates.label': 'Templates',
        'hub-admin.diagnostics.label': 'Diagnostics',
        'hub-admin.edge-bindings.label': 'Edge Bindings',
        'hub-admin.danger-zone.label': 'Danger Zone',
        'hub-admin.routes.label': 'Routes',
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
