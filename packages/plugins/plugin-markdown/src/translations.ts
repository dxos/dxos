//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { translations as editorTranslations } from '@dxos/react-ui-editor/translations';

import { meta } from '#meta';
import { Markdown } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Markdown.Document)]: {
        'typename.label': 'Document',
        'typename.label_zero': 'Documents',
        'typename.label_one': 'Document',
        'typename.label_other': 'Documents',
        'object-name.placeholder': 'New document',
        'add-object.label': 'Add document',
        'rename-object.label': 'Rename document',
        'delete-object.label': 'Delete document',
        'object-deleted.label': 'Document deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Editor',
        'choose-markdown-from-space-dialog.title': 'Choose one or more documents to add',
        'empty-choose-markdown-from-space.message': 'None available; try creating a new one instead?',
        'chooser-done.label': 'Add selected',
        'editor.placeholder': 'Enter text…',
        'toggle-view-mode.label': 'Toggle read-only',
        'upload-image.label': 'Upload image',
        'fallback.title': 'Untitled',
        'navigate-to-document.label': 'Open document',
        'words.label': 'words',
        'words.label_zero': 'words',
        'words.label_one': 'word',
        'words.label_other': 'words',
        'version-banner-checkpoint.label': 'Viewing checkpoint',
        'version-banner-branch.label': 'Editing branch',
        'version-banner-fork.label': 'Branch created from',
        'restore.label': 'Restore',
        'branch-from.label': 'Branch from here',
        'suggest-edits.label': 'Suggest edits',
        'review-mode.title': 'Review mode',
        'review-mode.editing.label': 'Editing',
        'review-mode.suggesting.label': 'Suggesting',
        'review-mode.viewing.label': 'Viewing',
        'branch-view-base.label': 'Base',
        'branch-view-diff.label': 'Diff',
        'branch-view-branch.label': 'Branch',
        'close.label': 'Close',
        'branches.title': 'Branches',
        'checkpoints.title': 'Checkpoints',
        'create.label': 'Create',
        'create-checkpoint.label': 'Create revision',
        'delete-branch.label': 'Delete',
        'current.label': 'Current',
        'main-branch.label': 'Main',
        'version-name.placeholder': 'Checkpoint name…',
        'branch-name.placeholder': 'Branch name…',
        'versions.title': 'Versions',
        'open-history.label': 'Open history',
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
  ...editorTranslations,
  ...componentsTranslations,
] as const satisfies Resource[];
