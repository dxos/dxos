//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-debug';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'filter.placeholder': 'Filter (e.g. space-proxy:debug)',
        'level.label': 'Level',
        'record.label': 'Record',
        'clear.label': 'Clear',
        'copy.label': 'Copy log',
        'copy-entry.label': 'Copy entry',
        'empty.message': 'No log entries.',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.trace': 'Trace',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.debug': 'Debug',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.verbose': 'Verbose',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.info': 'Info',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.warn': 'Warn',
        // oxlint-disable-next-line @dxos/rules/translation-key-format -- level enum name, not a UI-role suffix.
        'level.error': 'Error',
      },
    },
  },
] as const satisfies Resource[];
