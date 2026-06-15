//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type ComponentType } from 'react';

import { type Obj } from '@dxos/echo';
import { type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { type ProjectionModel } from '@dxos/schema';

import { type ColumnStructure, type KanbanChangeCallback, UNCATEGORIZED_ATTRIBUTES, UNCATEGORIZED_VALUE } from '#types';

const KANBAN_BOARD_NAME = 'KanbanBoard.Context';

/**
 * Card tile props. Defined here (rather than in `KanbanCard.tsx`) so the
 * context type can reference it without forming a cycle through that
 * module's runtime exports — webkit treats the resulting TDZ as a hard
 * error while other engines are lenient.
 */
export type KanbanCardProps = Pick<MosaicTileProps<Obj.Unknown>, 'location' | 'data' | 'debug' | 'draggable'>;

/**
 * Column tile props. See note on {@link KanbanCardProps}.
 */
export type KanbanColumnProps = Pick<MosaicTileProps<ColumnStructure>, 'location' | 'data' | 'debug' | 'draggable'>;

/**
 * Context value for the Kanban board.
 * Items are Echo objects (Obj.Unknown).
 */
export type KanbanBoardContextValue = {
  kanbanId: string;
  projection: ProjectionModel | undefined;
  columnFieldPath: string | undefined;
  change: KanbanChangeCallback<Obj.Unknown>;
  pivotFieldId: string | undefined;
  getPivotAttributes: (columnValue: string) => { title: string; color: string };
  itemTile?: ComponentType<KanbanCardProps>; // TODO(burdon): Prop.
  onCardAdd?: (columnValue: string | undefined) => string | undefined;
  onCardRemove?: (card: Obj.Unknown) => void;
};

export const [KanbanBoardContext, useKanbanBoard] = createContext<KanbanBoardContextValue>(KANBAN_BOARD_NAME, {
  kanbanId: 'never',
  projection: undefined,
  columnFieldPath: undefined,
  change: { kanban: () => {}, setItemField: () => {} },
  pivotFieldId: undefined,
  getPivotAttributes: (id: string) =>
    id === UNCATEGORIZED_VALUE ? UNCATEGORIZED_ATTRIBUTES : { title: id, color: 'neutral' },
  itemTile: (() => null) as ComponentType<KanbanCardProps>,
});
