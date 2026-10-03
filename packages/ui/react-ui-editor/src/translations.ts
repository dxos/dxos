//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-editor';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'comment.label': 'Create comment',
        'image.label': 'Insert image',
        'search.label': 'Search',

        'block.label': 'Block',
        'block.blockquote.label': 'Block quote',
        'block.codeblock.label': 'Code block',
        'block.table.label': 'Create table',

        'formatting.label': 'Formatting',
        'formatting.strong.label': 'Bold',
        'formatting.emphasis.label': 'Italics',
        'formatting.strikethrough.label': 'Strikethrough',
        'formatting.code.label': 'Code',
        'formatting.link.label': 'Link',

        'list.bullet.label': 'Bullet list',
        'list.ordered.label': 'Numbered list',
        'list.task.label': 'Task list',

        'heading.label': 'Heading level',
        'heading-level.label_zero': 'Paragraph',
        'heading-level.label_one': 'Heading level {{count}}',
        'heading-level.label_other': 'Heading level {{count}}',

        'view-mode.label': 'Editor view',
        'view-mode.preview.label': 'Markdown',
        'view-mode.source.label': 'Plain text',
        'view-mode.readonly.label': 'Read only',
      },
    },
  },
] as const satisfies Resource[];
