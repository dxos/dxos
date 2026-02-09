//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-editor';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'strong label': 'Bold',
        'emphasis label': 'Italics',
        'strikethrough label': 'Strikethrough',
        'code label': 'Code',
        'link label': 'Link',
        'list-bullet label': 'Bullet list',
        'list-ordered label': 'Numbered list',
        'list-task label': 'Task list',
        'blockquote label': 'Block quote',
        'codeblock label': 'Code block',
        'comment label': 'Create comment',
        'selection overlaps existing comment label': 'Selection overlaps existing comment',
        'select text to comment label': 'Select text to comment',
        'image label': 'Insert image',
        'table label': 'Create table',
        'heading label': 'Heading level',
        'heading level label_zero': 'Paragraph',
        'heading level label_one': 'Heading level {{count}}',
        'heading level label_other': 'Heading level {{count}}',
        'search label': 'Search',
        'view mode label': 'Editor view',
        'preview mode label': 'Markdown',
        'readonly mode label': 'Read only',
        'source mode label': 'Plain text',
      },
    },
  },
] as const satisfies Resource[];
