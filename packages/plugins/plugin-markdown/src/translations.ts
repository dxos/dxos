//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as editorTranslations } from '@dxos/react-ui-editor';

import { meta } from './meta';
import { Markdown } from './types';

export const translations = [
  {
    'en-US': {
      [Markdown.Document.typename]: {
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
      [meta.id]: {
        'plugin.name': 'Editor',
        'settings.title': 'Editor settings',
        'choose-markdown-from-space-dialog.title': 'Choose one or more documents to add',
        // TODO(burdon): Style-guide for user-facing text (e.g., hints, questions, capitalization, etc.)
        'empty-choose-markdown-from-space.message': 'None available; try creating a new one instead?',
        'chooser-done.label': 'Add selected',
        'editor.placeholder': 'Start typing…',
        'editor-input-mode.label': 'Editor input mode',
        'editor-input-mode.description': 'Choose keyboard bindings for the editor.',
        'select-editor-input-mode.placeholder': 'Select editor input mode…',
        'settings.editor-input-mode.default.label': 'Default',
        'settings.editor-input-mode.vim.label': 'Vim',
        'settings.editor-input-mode.vscode.label': 'VS Code',
        'settings.toolbar.label': 'Show toolbar',
        'settings.toolbar.description': 'Display a formatting toolbar above the editor.',
        'settings.numbered-headings.label': 'Numbered headings',
        'settings.numbered-headings.description': 'Automatically number heading levels in the document.',
        'settings.folding.label': 'Folding',
        'settings.folding.description': 'Allow collapsing and expanding sections by heading.',
        'settings.experimental.label': 'Enable experimental features',
        'settings.experimental.description': 'Turn on features that are still in development.',
        'settings.debug.label': 'Enable debugging features',
        'settings.debug.description': 'Show developer tools and diagnostics for the editor.',
        'settings.debug-typewriter.label': 'Typewriter script',
        'settings.debug-typewriter.description': 'Script to replay typed input for testing purposes.',
        'settings.debug-typewriter.placeholder': 'Typewriter script...',
        'toggle-view-mode.label': 'Toggle read-only',
        'default-view-mode.label': 'Default view mode',
        'default-view-mode.description': 'Set whether documents open in editing or read-only mode.',
        'upload-image.label': 'Upload image',
        'fallback.title': 'Untitled',
        'navigate-to-document.label': 'Open document',

        'words.label': 'words',
        'words.label_zero': 'words',
        'words.label_one': 'word',
        'words.label_other': 'words',
      },
    },
  },
  ...editorTranslations,
] as const satisfies Resource[];
