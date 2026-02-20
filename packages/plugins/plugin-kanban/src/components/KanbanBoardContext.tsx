//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type ComponentType } from 'react';

import { type Obj } from '@dxos/echo';
import type { MosaicTileProps } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';

import { type KanbanChangeCallback, UNCATEGORIZED_ATTRIBUTES, UNCATEGORIZED_VALUE } from '../types';

const KANBAN_BOARD_CONTEXT_NAME = 'KanbanBoardContext';

/**
 * Props for the card tile used inside columns.
 * Tiles can read projection, onRemoveCard, etc. from useKanbanBoard() when needed.
 */
export type KanbanCardTileProps = Pick<MosaicTileProps<Obj.Unknown>, 'classNames' | 'location' | 'data' | 'debug'>;

/** Context value for the Kanban board; items are Echo objects (Obj.Unknown). */
export type KanbanBoardContextValue = {
  kanbanId: string;
  projection: ProjectionModel | undefined;
  columnFieldPath: string | undefined;
  pivotFieldId: string | undefined;
  getPivotAttributes: (columnValue: string) => { title: string; color: string };
  itemTile: ComponentType<KanbanCardTileProps>;
  change: KanbanChangeCallback<Obj.Unknown>;
  onAddCard?: (columnValue: string | undefined) => string | undefined;
  onRemoveCard?: (card: Obj.Unknown) => void;
};

const [KanbanBoardContext, useKanbanBoard] = createContext<KanbanBoardContextValue>(KANBAN_BOARD_CONTEXT_NAME, {
  kanbanId: 'never',
  columnFieldPath: undefined,
  change: { kanban: () => {}, setItemField: () => {} },
  projection: undefined,
  pivotFieldId: undefined,
  getPivotAttributes: (id: string) =>
    id === UNCATEGORIZED_VALUE ? UNCATEGORIZED_ATTRIBUTES : { title: id, color: 'neutral' },
  itemTile: (() => null) as ComponentType<KanbanCardTileProps>,
});

export { KanbanBoardContext, useKanbanBoard };
