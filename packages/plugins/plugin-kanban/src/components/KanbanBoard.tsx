//
// Copyright 2025 DXOS.org
//

import { type Atom, RegistryContext } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, useContext, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Board, useBoard } from '@dxos/react-ui-mosaic';
import type { MosaicTileProps } from '@dxos/react-ui-mosaic';
import type { ProjectionModel } from '@dxos/schema';

import { useKanbanBoardModel, useKanbanColumnEventHandler } from '../hooks';
import { type KanbanChangeCallback, UNCATEGORIZED_ATTRIBUTES, UNCATEGORIZED_VALUE } from '../types';
import { type Kanban } from '../types';

import { KanbanCardTile } from './KanbanCardTile';
import { KanbanColumn as KanbanColumnTile } from './KanbanColumn';

const KANBAN_BOARD_CONTEXT_NAME = 'KanbanBoard.Context';

/**
 * Props for the card tile used inside columns.
 * Tiles can read projection, onRemoveCard, etc. from useKanbanBoard() when needed.
 */
export type KanbanCardTileProps = Pick<MosaicTileProps<Obj.Unknown>, 'location' | 'data' | 'debug'>;

/** Context value for the Kanban board; items are Echo objects (Obj.Unknown). */
type KanbanBoardContextValue = {
  kanbanId: string;
  projection: ProjectionModel | undefined;
  columnFieldPath: string | undefined;
  pivotFieldId: string | undefined;
  getPivotAttributes: (columnValue: string) => { title: string; color: string };
  itemTile: ComponentType<KanbanCardTileProps>;
  change: KanbanChangeCallback<Obj.Unknown>;
  onCardAdd?: (columnValue: string | undefined) => string | undefined;
  onCardRemove?: (card: Obj.Unknown) => void;
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

export { useKanbanBoard };

const KANBAN_BOARD_ROOT = 'KanbanBoard.Root';

/** Root accepts Echo objects only; context is typed as Obj.Unknown. Props derived from context value + Root-only inputs. */
type KanbanBoardRootProps = PropsWithChildren<
  Pick<KanbanBoardContextValue, 'change' | 'itemTile'> & {
    kanban: Kanban.Kanban;
    /** Required when providing context; Root derives columnFieldPath, pivotFieldId, getPivotAttributes from kanban + projection. */
    projection: ProjectionModel;
    /** Atom of items (e.g. from AtomQuery for DB, or Atom.make([]) for in-memory). */
    items: Atom.Atom<Obj.Unknown[]>;
    // TODO(burdon): onCardAdd/Remove
    onAddCard?: (columnValue: string | undefined) => string | undefined;
    onRemoveCard?: (card: Obj.Unknown) => void;
  }
>;

export const KanbanBoardRoot = ({
  kanban,
  projection,
  items,
  change,
  onAddCard,
  onRemoveCard,
  itemTile,
  children,
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

  const getPivotAttributes = useMemo(() => {
    return (columnValue: string) => {
      if (columnValue === UNCATEGORIZED_VALUE) {
        return UNCATEGORIZED_ATTRIBUTES;
      }

      const options = projection?.tryGetFieldProjection(pivotFieldId ?? '')?.props.options ?? [];
      const option = options.find((o) => o.id === columnValue);
      return option ?? ({ title: columnValue, color: 'neutral' } as const);
    };
  }, [projection, pivotFieldId]);

  const contextValue = useMemo(
    () => ({
      kanbanId: Obj.getDXN(kanban).toString(),
      projection,
      columnFieldPath,
      pivotFieldId,
      getPivotAttributes,
      itemTile,
      change,
      onCardAdd: onAddCard,
      onCardRemove: onRemoveCard,
    }),
    [kanban, projection, columnFieldPath, pivotFieldId, getPivotAttributes, itemTile, change, onAddCard, onRemoveCard],
  );

  return (
    <KanbanBoardContext {...contextValue}>
      <Board.Root model={model}>{children}</Board.Root>
    </KanbanBoardContext>
  );
};

KanbanBoardRoot.displayName = KANBAN_BOARD_ROOT;

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

  return <Board.Content id={kanbanId} eventHandler={columnEventHandler} Tile={KanbanColumnTile} />;
};

KanbanBoardContent.displayName = KANBAN_BOARD_CONTENT;

export const KanbanBoard = {
  Root: KanbanBoardRoot,
  Content: KanbanBoardContent,
  CardTile: KanbanCardTile,
};
