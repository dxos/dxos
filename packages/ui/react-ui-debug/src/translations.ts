//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

/** Namespace of this package's strings in the i18n resources. */
export const translationKey = '@dxos/react-ui-debug';

/** English strings for the debug log panel components. */
export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'clear.label': 'Clear',
        'copy-entry.label': 'Copy entry',
        'copy.label': 'Copy log',
        'empty.message': 'No log entries.',
        'filter.placeholder': 'Filter (e.g. space-proxy:debug)',
        'level.label': 'Level',
        'levels.empty.message': 'No log files registered yet.',
        'levels.filter.placeholder': 'Filter files…',
        'levels.inherit.label': 'Inherit',
        'levels.label': 'Log levels',
        'levels.reset.label': 'Reset all levels',
        'record.label': 'Record',
        'search.clear.label': 'Clear filter',
        'search.no-matches.message': 'No matching entries.',
        'search.placeholder': 'Find in buffer…',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.trace': 'Trace',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.debug': 'Debug',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.verbose': 'Verbose',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.info': 'Info',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.warn': 'Warn',
        // oxlint-disable-next-line @dxos/rules/translation-key-format
        'level.error': 'Error',
      },
    },
  },
] as const satisfies Theme.Resource[];
