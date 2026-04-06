//
// Copyright 2024 DXOS.org
//

import {
  ListItem,
  ListItemIconButton,
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
 *
 * @deprecated Use react-ui-mosaic.
 */
export const List = {
  Root: ListRoot,
  Item: ListItem,
  ItemDragPreview: ListItemDragPreview,
  ItemWrapper: ListItemWrapper,
  ItemDragHandle: ListItemDragHandle,
  ItemIconButton: ListItemIconButton,
  ItemDeleteButton: ListItemDeleteButton,
  ItemTitle: ListItemTitle,
};

type ListItem = ListItemRecord;

export type { ListRootProps, ListItemProps, ListItem, ListItemRecord };
