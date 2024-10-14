//
// Copyright 2024 DXOS.org
//

import {
  IconButton,
  type IconButtonProps,
  ListItem,
  ListItemDeleteButton,
  ListItemDragHandle,
  ListItemDragPreview,
  type ListItemProps,
  type ListItemRecord,
  ListItemTitle,
  ListItemWrapper,
} from './ListItem';
import { ListRoot, type ListRootProps } from './ListRoot';

/**
 * Draggable list.
 * Ref: https://github.com/atlassian/pragmatic-drag-and-drop
 * Ref: https://github.com/alexreardon/pdnd-react-tailwind/blob/main/src/task.tsx
 */
export const List = {
  Root: ListRoot,
  Item: ListItem,
  ItemDragPreview: ListItemDragPreview,
  ItemWrapper: ListItemWrapper,
  ItemDragHandle: ListItemDragHandle,
  ItemDeleteButton: ListItemDeleteButton,
  ItemTitle: ListItemTitle,
  IconButton,
};

type ListItem = ListItemRecord;

export type { ListRootProps, ListItemProps, IconButtonProps, ListItem };
