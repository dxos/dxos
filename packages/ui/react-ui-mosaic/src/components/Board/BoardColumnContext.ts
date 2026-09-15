import { createContext } from '@dxos/react-hooks';
//
// Copyright 2023 DXOS.org
//

// Kept out of `Column.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the context and hook exported beside them force a full page reload on every edit.

export const BOARD_COLUMN_CONTEXT_NAME = 'Board.Column';

export type BoardColumnContextValue<TColumn = unknown> = {
  column: TColumn;
};

export const [BoardColumnProvider, useBoardColumnContext] = createContext<BoardColumnContextValue | null>(
  BOARD_COLUMN_CONTEXT_NAME,
  null,
);

/** Returns the current column when rendered inside a board column (e.g., in column header or item tile). */
export function useBoardColumn<TColumn = unknown>(): TColumn | undefined {
  const value = useBoardColumnContext(BOARD_COLUMN_CONTEXT_NAME);
  return value?.column as TColumn | undefined;
}
