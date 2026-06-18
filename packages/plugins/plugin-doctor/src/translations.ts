//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Doctor',
        'diagnostics-tab.label': 'Diagnostics',
        'run-diagnostics.label': 'Run diagnostics',
        'cancel-diagnostics.label': 'Cancel',
        'providers-count.label_one': '{{count}} diagnostic',
        'providers-count.label_other': '{{count}} diagnostics',
        'idle.description': 'Click "Run diagnostics" to scan the workspace for problems.',
        'progress.label': 'Running {{current}} / {{total}} {{label}}',
        'summary.label_zero': 'No issues found.',
        'summary.label_one': '{{count}} issue found.',
        'summary.label_other': '{{count}} issues found.',
        'summary.failed.label_one': '{{count}} provider failed.',
        'summary.failed.label_other': '{{count}} providers failed.',
        'result.ok.label': 'OK',
        'result.issues.label_one': '{{count}} issue',
        'result.issues.label_other': '{{count}} issues',
        'result.error.label': 'Error',
        'diagnostic.schema.label': 'Schema validation',
        'diagnostic.schema.description': 'Validates every ECHO object against its declared schema.',
        'diagnostic.dangling-refs.label': 'Dangling references',
        'diagnostic.dangling-refs.description': 'Walks all references and relations to ensure their targets resolve.',
        'diagnostic.operations-services.label': 'Operation services',
        'diagnostic.operations-services.description':
          'Flags saved operations that request services not registered in the runtime whitelist.',
        'diagnostic.blueprint-tools.label': 'Blueprint tools',
        'diagnostic.blueprint-tools.description':
          'Flags saved blueprints that reference tools not registered by any plugin toolkit.',
      },
    },
  },
] as const satisfies Resource[];
