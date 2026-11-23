//
// Copyright 2026 DXOS.org
//

/** The slide a row move lands on; a shorter last row catches a move from a column it does not reach. */
export const moveByRow = (index: number, count: number, columns: number, direction: -1 | 1): number => {
  const next = index + direction * columns;
  if (next >= 0 && next < count) {
    return next;
  }
  const hasRowBelow = Math.floor(index / columns) < Math.floor((count - 1) / columns);
  return direction === 1 && hasRowBelow ? count - 1 : index;
};

/** The tiles a wrapped grid has laid out on its first row, which is the number of columns it renders right now. */
export const countColumns = (grid: Element): number => {
  const tiles = Array.from(grid.querySelectorAll<HTMLElement>('[role="option"]'));
  const top = tiles[0]?.offsetTop;
  return Math.max(1, tiles.filter((tile) => tile.offsetTop === top).length);
};
