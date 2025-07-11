//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-editor';

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
        'heading label': 'Heading level',
        'table label': 'Create table',
        'heading level label_zero': 'Paragraph',
        'heading level label_one': 'Heading level {{count}}',
        'heading level label_other': 'Heading level {{count}}',
        'view mode label': 'Editor view',
        'preview mode label': 'Live preview',
        'readonly mode label': 'Read only',
        'search label': 'Search',
        'source mode label': 'Source',
      },
    },
  },
] as const satisfies Resource[];
