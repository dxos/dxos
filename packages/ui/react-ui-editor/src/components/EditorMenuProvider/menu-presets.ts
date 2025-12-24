//
// Copyright 2025 DXOS.org
//

import { insertAtLineStart } from '@dxos/ui-editor';

import { type EditorMenuGroup } from './menu';
import { popoverRangeEffect } from './popover';

export const formattingCommands: EditorMenuGroup = {
  id: 'markdown',
  label: 'Markdown',
  items: [
    {
      id: 'heading-1',
      label: 'Heading 1',
      icon: 'ph--text-h-one--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '# '),
    },
    {
      id: 'heading-2',
      label: 'Heading 2',
      icon: 'ph--text-h-two--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '## '),
    },
    {
      id: 'heading-3',
      label: 'Heading 3',
      icon: 'ph--text-h-three--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '### '),
    },
    {
      id: 'heading-4',
      label: 'Heading 4',
      icon: 'ph--text-h-four--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '#### '),
    },
    {
      id: 'heading-5',
      label: 'Heading 5',
      icon: 'ph--text-h-five--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '##### '),
    },
    {
      id: 'heading-6',
      label: 'Heading 6',
      icon: 'ph--text-h-six--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '###### '),
    },
    {
      id: 'bullet-list',
      label: 'Bullet List',
      icon: 'ph--list-bullets--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '- '),
    },
    {
      id: 'numbered-list',
      label: 'Numbered List',
      icon: 'ph--list-numbers--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '1. '),
    },
    {
      id: 'task-list',
      label: 'Task List',
      icon: 'ph--list-checks--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '- [ ] '),
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: 'ph--quotes--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '> '),
    },
    {
      id: 'code-block',
      label: 'Code Block',
      icon: 'ph--code-block--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '```\n\n```'),
    },
    {
      id: 'table',
      label: 'Table',
      icon: 'ph--table--regular',
      onSelect: ({ view, head }) => insertAtLineStart(view, head, '| | | |\n|---|---|---|\n| | | |'),
    },
  ],
};

export const linkSlashCommands: EditorMenuGroup = {
  id: 'link',
  label: 'Link',
  items: [
    {
      id: 'inline-link',
      label: 'Inline link',
      icon: 'ph--link--regular',
      onSelect: ({ view, head }) => {
        view.dispatch({
          changes: { from: head, insert: '@' },
          selection: { anchor: head + 1, head: head + 1 },
          effects: popoverRangeEffect.of({
            trigger: '@',
            range: { from: head, to: head + 1 },
          }),
        });
      },
    },
    {
      id: 'block-embed',
      label: 'Block embed',
      icon: 'ph--lego--regular',
      onSelect: ({ view, head }) => {
        view.dispatch({
          changes: { from: head, insert: '@@' },
          selection: { anchor: head + 2, head: head + 2 },
          effects: popoverRangeEffect.of({
            trigger: '@',
            range: { from: head, to: head + 2 },
          }),
        });
      },
    },
  ],
};
