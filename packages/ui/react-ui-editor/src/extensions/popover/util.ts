//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type PopoverMenuGroup, type PopoverMenuItem } from './menu';

export const insertAtCursor = (view: EditorView, head: number, insert: string) => {
  view.dispatch({
    changes: { from: head, to: head, insert },
    selection: { anchor: head + insert.length, head: head + insert.length },
  });
};

/**
 * If the cursor is at the start of a line, insert the text at the cursor.
 * Otherwise, insert the text on a new line.
 */
export const insertAtLineStart = (view: EditorView, head: number, insert: string) => {
  const line = view.state.doc.lineAt(head);
  if (line.from === head) {
    insertAtCursor(view, head, insert);
  } else {
    insert = '\n' + insert;
    view.dispatch({
      changes: { from: line.to, to: line.to, insert },
      selection: { anchor: line.to + insert.length, head: line.to + insert.length },
    });
  }
};

export const getMenuItem = (groups: PopoverMenuGroup[], id?: string): PopoverMenuItem | undefined => {
  return groups.flatMap((group) => group.items).find((item) => item.id === id);
};

export const getNextMenuItem = (groups: PopoverMenuGroup[], id?: string): PopoverMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return index < items.length - 1 ? items[index + 1] : items[index];
};

export const getPreviousMenuItem = (groups: PopoverMenuGroup[], id?: string): PopoverMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return index > 0 ? items[index - 1] : items[index];
};

export const filterItems = (
  groups: PopoverMenuGroup[],
  filter: (item: PopoverMenuItem) => boolean,
): PopoverMenuGroup[] => {
  return groups.map((group) => ({
    ...group,
    items: group.items.filter(filter),
  }));
};
