//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, useCallback, useContext, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Board, useBoard } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';

import { useKanbanBoardModel, useKanbanColumnEventHandler } from '../../hooks';
import { type Kanban, type KanbanChangeCallback, UNCATEGORIZED_ATTRIBUTES, UNCATEGORIZED_VALUE } from '../../types';

import { KanbanCard, type KanbanCardProps } from './KanbanCard';
import { KanbanColumn, type KanbanColumnProps } from './KanbanColumn';

// TODO(burdon): Rename Kanban.

//
// Context
//

const KANBAN_BOARD_NAME = 'KanbanBoard.Context';

/**
 * Context value for the Kanban board.
 * Items are Echo objects (Obj.Unknown).
 */
type KanbanBoardContextValue = {
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

const [KanbanBoardContext, useKanbanBoard] = createContext<KanbanBoardContextValue>(KANBAN_BOARD_NAME, {
  kanbanId: 'never',
  projection: undefined,
  columnFieldPath: undefined,
  change: { kanban: () => {}, setItemField: () => {} },
  pivotFieldId: undefined,
  getPivotAttributes: (id: string) =>
    id === UNCATEGORIZED_VALUE ? UNCATEGORIZED_ATTRIBUTES : { title: id, color: 'neutral' },
  itemTile: (() => null) as ComponentType<KanbanCardProps>,
});

//
// Root
//

const KANBAN_BOARD_ROOT = 'KanbanBoard.Root';

type KanbanBoardRootProps = PropsWithChildren<
  Pick<KanbanBoardContextValue, 'change' | 'itemTile'> & {
    kanban: Kanban.Kanban;
    /** Required when providing context; Root derives columnFieldPath, pivotFieldId, getPivotAttributes from kanban + projection. */
    projection: ProjectionModel;
    /** Atom of items (e.g. from AtomQuery for DB, or Atom.make([]) for in-memory). */
    items: Atom.Atom<Obj.Unknown[]>;
    onCardAdd?: (columnValue: string | undefined) => string | undefined;
    onCardRemove?: (card: Obj.Unknown) => void;
  }
>;

export const KanbanBoardRoot = ({
  children,
  change,
  itemTile = KanbanCard,
  kanban,
  projection,
  items,
  onCardAdd,
  onCardRemove,
}: KanbanBoardRootProps) => {
  const registry = useContext(RegistryContext);
  const model = useKanbanBoardModel(kanban, projection, items, registry);

  const view = kanban?.view?.target;
  const pivotFieldId = view?.projection?.pivotFieldId;
  const columnFieldPath = useMemo(() => {
    if (pivotFieldId === undefined || !projection) {
      return undefined;
    }

    return projection.tryGetFieldProjection(pivotFieldId)?.props.property;
  }, [projection, pivotFieldId]);

  const getPivotAttributes = useCallback<KanbanBoardContextValue['getPivotAttributes']>((columnValue) => {
    if (columnValue === UNCATEGORIZED_VALUE) {
      return UNCATEGORIZED_ATTRIBUTES;
    }

    const options = projection?.tryGetFieldProjection(pivotFieldId ?? '')?.props.options ?? [];
    const option = options.find((option) => option.id === columnValue);
    return option ?? ({ title: columnValue, color: 'neutral' } as const);
  }, [projection, pivotFieldId]);

  return (
    <KanbanBoardContext
      kanbanId={Obj.getDXN(kanban).toString()}
      projection={projection}
      columnFieldPath={columnFieldPath}
      pivotFieldId={pivotFieldId}
      getPivotAttributes={getPivotAttributes}
      itemTile={itemTile}
      change={change}
      onCardAdd={onCardAdd}
      onCardRemove={onCardRemove}
    >
      <Board.Root model={model}>{children}</Board.Root>
    </KanbanBoardContext>
  );
};

KanbanBoardRoot.displayName = KANBAN_BOARD_ROOT;

//
// KanbanBoardContent
//

const KANBAN_BOARD_CONTENT = 'KanbanBoard.Content';

export const KanbanBoardContent = () => {
  const { model } = useBoard(KANBAN_BOARD_CONTENT);
  const { kanbanId, projection, pivotFieldId, change } = useKanbanBoard(KANBAN_BOARD_CONTENT);

  const columnEventHandler = useKanbanColumnEventHandler({
    id: `${kanbanId}-columns`,
    model,
    projection: projection ?? undefined,
    pivotFieldId: pivotFieldId ?? undefined,
    change,
  });

  return <Board.Content id={kanbanId} eventHandler={columnEventHandler} Tile={KanbanColumn} />;
};

KanbanBoardContent.displayName = KANBAN_BOARD_CONTENT;

//
// KanbanBoard
//

export const KanbanBoard = {
  Root: KanbanBoardRoot,
  Content: KanbanBoardContent,
  Column: KanbanColumn,
  Card: KanbanCard,
};

export { useKanbanBoard };


export type { KanbanBoardRootProps as KanbanBoardProps, KanbanCardProps, KanbanColumnProps };
