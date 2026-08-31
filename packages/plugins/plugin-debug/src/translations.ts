//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as logPanelTranslations } from '@dxos/react-ui-debug/translations';

import { meta } from '#meta';

export const translations = [
  // The R0 log companion and status popover render `@dxos/react-ui-debug`, so its namespace must be registered.
  ...logPanelTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Debug',
        'debug.label': 'Debug',
        'generate-objects.label': 'Generate Objects',
        'space-objects.label': 'Database',
        'open-debug-panel.label': 'Show Debug',
        'logs.label': 'Logs',
        'open-logs.label': 'Show logs',
        'open-console.label': 'Show console',
        'debug-port-status.running.label': 'Agent debug port is open — show console',
        'console.clear.label': 'Clear log',
        'console.copy.label': 'Copy last result',

        'remove-all-objects.confirm.description': 'Remove all objects from this space? This cannot be undone.',
        'remove-all-objects.error.title': 'Failed to remove objects.',
        'remove-all-objects.toast.title': 'Space cleared',
        'remove-all-objects.toast.description_one': 'Removed {{count}} object.',
        'remove-all-objects.toast.description_other': 'Removed {{count}} objects.',

        'collect-garbage.confirm.description':
          "Permanently reclaim this space's deleted objects? This cannot be undone.",
        'collect-garbage.error.title': 'Garbage collection failed.',
        'collect-garbage.toast.title': 'Garbage collected',
        'collect-garbage.toast.empty.description': 'Nothing to reclaim.',
        'collect-garbage.toast.description_one': 'Reclaimed {{count}} document.',
        'collect-garbage.toast.description_other': 'Reclaimed {{count}} documents.',

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

        'settings.debug-port.section.label': 'Agent debug port',
        'settings.debug-port.section.description':
          'Lets a local agent evaluate code against this page via composer-recovery.js. Off by default; stops on reload.',
        'settings.debug-port.label': 'Open debug port.',
        'settings.debug-port.description':
          'Runs arbitrary code from a loopback server with full access to your data. Only enable while you are working with an agent you trust.',
        'settings.debug-port.running.label': 'Listening on',
        'settings.debug-port.session.label': 'Session id',
        'settings.debug-port.session.description':
          'Pass to composer-recovery.js --session. A new id is issued on every restart.',
        'settings.debug-port.copy-session.label': 'Copy session id.',
        'settings.debug-port.log.label': 'Debug port log',
      },
    },
  },
] as const satisfies Resource[];
