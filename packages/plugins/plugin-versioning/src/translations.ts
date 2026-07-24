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
        'version-banner-checkpoint.label': 'Viewing checkpoint',
        'version-banner-branch.label': 'Editing branch',
        'version-banner-fork.label': 'Branch created from',
        'restore.label': 'Restore',
        'branch-from.label': 'Branch from here',
        'branch-view-base.label': 'Base',
        'branch-view-diff.label': 'Diff',
        'branch-view-branch.label': 'Branch',
        'close.label': 'Close',
        'main-branch.label': 'Main',
        'versions.title': 'Versions',
        'branch-count.label': '{{count}} branches',
        'branch-count.label_zero': 'no branches',
        'branch-count.label_one': '{{count}} branch',
        'branch-count.label_other': '{{count}} branches',
        'checkpoint-count.label': '{{count}} checkpoints',
        'checkpoint-count.label_zero': 'no checkpoints',
        'checkpoint-count.label_one': '{{count}} checkpoint',
        'checkpoint-count.label_other': '{{count}} checkpoints',
      },
    },
  },
] as const satisfies Resource[];
