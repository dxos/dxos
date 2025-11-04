//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';

import { type Label } from '@dxos/react-ui';
import { type MaybePromise } from '@dxos/util';

import { insertAtCursor } from './util';

export type PopoverMenuGroup = {
  id: string;
  label?: Label;
  items: PopoverMenuItem[];
};

export type PopoverMenuItem = {
  id: string;
  label: Label;
  icon?: string;
  onSelect?: (view: EditorView, head: number) => MaybePromise<void>;
};

export const getMenuItem = (groups: PopoverMenuGroup[], id?: string): PopoverMenuItem | undefined =>
  groups.flatMap((group) => group.items).find((item) => item.id === id);

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

export const createMenuGroup = ({
  id = 'menu',
  label,
  items,
}: {
  id?: string;
  label?: Label;
  items: string[];
}): PopoverMenuGroup => ({
  id,
  label,
  items: items.map((item, i) => ({
    id: `${id}-${i}`,
    label: item,
    onSelect: (view, head) => insertAtCursor(view, head, item),
  })),
});

export const filterMenuGroups = (
  groups: PopoverMenuGroup[],
  filter: (item: PopoverMenuItem) => boolean,
): PopoverMenuGroup[] =>
  groups.map((group) => ({
    ...group,
    items: group.items.filter(filter),
  }));
