//
// Copyright 2024 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';

import { type GridContextValue } from './Grid.tsx';

// Kept out of `Grid.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context, fragments and re-exported helpers force a full page reload on every edit.

export type GridScopedProps<P> = P & { __gridScope?: Scope };

export const GRID_NAME = 'Grid';

export const [createGridContext, createGridScope] = createContextScope(GRID_NAME, []);

export const [GridProvider, useGridContext] = createGridContext<GridContextValue>(GRID_NAME);

// NOTE(Zan): These fragments add border to w-end and h-end of the grid using pseudo-elements.
// These are offset by 1px to avoid double borders in planks.
export const gridSeparatorInlineEnd =
  '[&>.dx-grid]:relative [&>.dx-grid]:after:absolute [&>.dx-grid]:after:inset-y-0 [&>.dx-grid]:after:-right-px [&>.dx-grid]:after:w-px [&>.dx-grid]:after:bg-subdued-separator';
export const gridSeparatorBlockEnd =
  '[&>.dx-grid]:relative [&>.dx-grid]:before:absolute [&>.dx-grid]:before:inset-x-0 [&>.dx-grid]:before:-bottom-px [&>.dx-grid]:before:h-px [&>.dx-grid]:before:bg-subdued-separator';

export {
  DxEditRequest,
  cellQuery,
  closestCell,
  colToA1Notation,
  commentedClassName,
  parseCellIndex,
  rowToA1Notation,
  toPlaneCellIndex,
} from '@dxos/lit-grid';
