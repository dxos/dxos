//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { insertAtLineStart } from '@dxos/ui-editor';

import { type EditorMenuGroup } from './menu';
import { popoverRangeEffect } from './popover';

/**
 * Re-open the popover in link-query ("@") mode at the cursor, seeding the same query shape the user
 * would get by typing the trigger manually: a single "@" for an inline link, "@@" for a block embed.
 * The consumer's `@` handler (e.g. plugin-markdown's link query) renders the object picker and, on
 * selection, replaces this range with the corresponding markdown link.
 *
 * Deferred to the next frame: selecting a slash-menu item deletes the "/" range, which closes the
 * popover; opening synchronously races that close (`onActivate` reads a stale open state) and the
 * picker never appears.
 */
const openLinkQuery = (view: EditorView, insert: '@' | '@@'): void => {
  requestAnimationFrame(() => {
    const { head } = view.state.selection.main;
    const to = head + insert.length;
    view.dispatch({
      changes: { from: head, insert },
      selection: { anchor: to, head: to },
      // The popover trigger is the single "@"; a second "@" lives in the query range and switches to block mode.
      effects: popoverRangeEffect.of({ trigger: '@', range: { from: head, to } }),
    });
  });
};

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
      onSelect: ({ view }) => openLinkQuery(view, '@'),
    },
    {
      id: 'inline-object',
      label: 'Inline object',
      icon: 'ph--lego--regular',
      onSelect: ({ view }) => openLinkQuery(view, '@@'),
    },
  ],
};
