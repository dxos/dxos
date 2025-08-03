//
// Copyright 2024 DXOS.org
//

import {
  IconButton,
  type IconButtonProps,
  ListItem,
  ListItemButton,
  ListItemDeleteButton,
  ListItemDragHandle,
  ListItemDragPreview,
  type ListItemProps,
  type ListItemRecord,
  ListItemTitle,
  ListItemWrapper,
} from './ListItem';
import { ListRoot, type ListRootProps } from './ListRoot';

// TODO(burdon): Multi-select model.
// TODO(burdon): Key nav.
// TODO(burdon): Animation.
// TODO(burdon): Constrain axis.
// TODO(burdon): Tree view.
// TODO(burdon): Fix autoscroll while dragging.

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
  ItemButton: ListItemButton,
  ItemTitle: ListItemTitle,
  IconButton,
};

type ListItem = ListItemRecord;

export type { ListRootProps, ListItemProps, IconButtonProps, ListItem, ListItemRecord };
