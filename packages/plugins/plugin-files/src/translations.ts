//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Local Files',
        'settings.title': 'Local files plugin settings',
        'missing-file-permissions.message': 'Permission required to view the currently selected file',
        'open-file.label': 'Open file',
        'open-directory.label': 'Open directory',
        're-open-file.label': 'Re-open file',
        're-open-directory.label': 'Re-open directory',
        'save.label': 'Save',
        'save-as.label': 'Save as',
        'close.label': 'Close',
        're-open.label': 'Re-open',
        'close-file.label': 'Close file',
        'close-directory.label': 'Close directory',
        'export.label': 'Export',
        'import.label': 'Import',
        'trigger-export.label': 'Run export to specified directory',
        'trigger-export.description': 'Export all content to the selected directory now.',
        'trigger-import.label': 'Import from a previous export',
        'trigger-import.description': 'Restore content from a previously exported directory.',
        'save-files-to-directory.label': 'Export directory',
        'save-files-to-directory.description':
          'NOTE: Export is intended for backup and overwrites all content in the selected directory.',
        'auto-export.label': 'Enable auto export',
        'auto-export.description': 'Automatically export content to the selected directory on a regular interval.',
        'auto-export-interval.label': 'Auto export interval (seconds)',
        'auto-export-interval.description': 'Time in seconds between automatic exports.',
        'open-local-files.label': 'Directly open local files (experimental)',
        'open-local-files.description': 'Open files directly from the local filesystem instead of importing them.',
        'currently-exporting.label': 'Exporting...',
        // https://www.i18next.com/translation-function/formatting#datetime
        'last-export-at.label': 'Last export at {{value, datetime}}',
        'no-previous-exports.label': 'No previous exports',
      },
    },
  },
] as const satisfies Resource[];
