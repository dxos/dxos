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
 * Draggable list with per-row drag handles and delete buttons.
 * Ref: https://github.com/atlassian/pragmatic-drag-and-drop
 * Ref: https://github.com/alexreardon/pdnd-react-tailwind/blob/main/src/task.tsx
 *
 * @deprecated New code should use one of:
 * - `RowList` / `CardList` from this same package — for selectable
 *   pickers (master/detail). Correct ARIA + dx-* by construction.
 * - `Mosaic.Stack` / `Mosaic.VirtualStack` from `@dxos/react-ui-mosaic`
 *   — for virtualized or drag-reorderable card stacks.
 *
 * This component is retained for the existing reorder-with-delete-button
 * use cases (plugin-calls, plugin-automation, plugin-zen, etc.) until
 * each is migrated; see `AUDIT.md` Phase 6 for the migration plan.
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
