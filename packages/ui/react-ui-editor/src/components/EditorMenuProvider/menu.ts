//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Label } from '@dxos/react-ui';
import { insertAtCursor } from '@dxos/ui-editor';
import { type MaybePromise } from '@dxos/util';

export type EditorMenuGroup = {
  id: string;
  label?: Label;
  items: EditorMenuItem[];
};

export type EditorMenuItem = {
  id: string;
  label: Label;
  icon?: string;
  onSelect?: (event: { view: EditorView; head: number }) => MaybePromise<void>;
};

export const getMenuItem = (groups: EditorMenuGroup[], id?: string): EditorMenuItem | undefined => {
  return groups.flatMap((group) => group.items).find((item) => item.id === id);
};

export const getNextMenuItem = (groups: EditorMenuGroup[], id?: string): EditorMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return index < items.length - 1 ? items[index + 1] : items[index];
};

export const getPreviousMenuItem = (groups: EditorMenuGroup[], id?: string): EditorMenuItem => {
  const items = groups.flatMap((group) => group.items);
  const index = items.findIndex((item) => item.id === id);
  return index > 0 ? items[index - 1] : items[index];
};

export const createMenuGroup = ({
  id = 'menu',
  label,
  filter,
  items,
}: {
  id?: string;
  label?: Label;
  filter?: string;
  items: string[];
}): EditorMenuGroup => ({
  id,
  label,
  items: items
    .filter((item) => !filter || item.toLowerCase().includes(filter.toLowerCase()))
    .map((item, i) => ({
      id: `${id}-${i}`,
      label: item,
      onSelect: ({ view, head }) => insertAtCursor(view, head, item),
    })),
});

export const filterMenuGroups = (
  groups: EditorMenuGroup[],
  filter: (item: EditorMenuItem) => boolean,
): EditorMenuGroup[] => {
  return groups.map((group) => ({
    ...group,
    items: group.items.filter(filter),
  }));
};
