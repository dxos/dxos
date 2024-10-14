//
// Copyright 2024 DXOS.org
//

import {
  type BaseListItem,
  IconButton,
  type IconButtonProps,
  ListItem,
  ListItemDeleteButton,
  ListItemDragHandle,
  ListItemDragPreview,
  ListItemWrapper,
  type ListItemProps,
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
  IconButton,
};

type ListItem = BaseListItem;

export type { ListRootProps, ListItemProps, IconButtonProps, ListItem };
