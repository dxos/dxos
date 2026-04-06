//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Filesystem',
        'open-directory.label': 'Open folder',
        'open-directory.description': 'Open a folder from your filesystem as a workspace',
        'close-directory.label': 'Close folder',
        'settings-panel.label': 'Settings',
        'settings-general.label': 'General',
        'icon.description': 'Choose an icon for this folder',
        'hue.description': 'Choose a color for this folder',
        'folder-properties.title': 'Folder properties',
        'remove-folder.label': 'Remove folder',
        'remove-folder.description': 'Remove this folder from the sidebar. Files on disk are not affected.',
      },
    },
  },
] as const satisfies Resource[];
