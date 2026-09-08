//
// Copyright 2023 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import { createContext } from '@dxos/react-hooks';
import { type GetId } from '@dxos/react-ui-dnd';

// Kept out of `Board.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the model, context and hook exported beside them force a full page reload on every edit.

export interface BoardModel<TColumn = any, TItem = any> {
  getColumnId: GetId<TColumn>;
  getItemId: GetId<TItem>;
  isColumn: (obj: unknown) => obj is TColumn;
  isItem: (obj: unknown) => obj is TItem;
  columns: Atom.Atom<readonly TColumn[] | TColumn[]>;
  items: (column: TColumn) => Atom.Atom<TItem[]>;
  getColumns: () => TColumn[];
  getItems: (column: TColumn) => TItem[];
  onColumnCreate?: () => Promise<TColumn>;
  onColumnDelete?: (column: TColumn) => void;
  onItemCreate?: (column: TColumn) => Promise<TItem>;
  onItemDelete?: (column: TColumn, item: TItem) => void;
}

//
// Context
//

export const BOARD_NAME = 'Board';

export type BoardContextValue<TColumn = any, TItem = any> = {
  model: BoardModel<TColumn, TItem>;
};

export const [BoardContextProvider, useBoardContext] = createContext<BoardContextValue>(BOARD_NAME);

/** Hook to read the board model from context (e.g. in custom column tiles). Pass TColumn and TItem for typed model. */
export function useBoard<TColumn = any, TItem = any>(displayName?: string): BoardContextValue<TColumn, TItem> {
  return useBoardContext(displayName ?? BOARD_NAME) as BoardContextValue<TColumn, TItem>;
}
