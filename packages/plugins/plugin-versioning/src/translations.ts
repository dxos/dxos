//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Versioning',
        'history-panel.title': 'History',
        'now.label': 'Now',
        'branch-tip.label': 'Tip',
        'create.label': 'Create',
        'create-checkpoint.label': 'Create revision',
        'create-branch.label': 'New branch',
        'merge.label': 'Merge',
        'discard-branch.label': 'Discard branch',
        'revision-name.placeholder': 'Revision name (optional)',
        'branch-name.placeholder': 'Branch name…',
      },
    },
  },
] as const satisfies Resource[];
