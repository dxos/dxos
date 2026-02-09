//
// Copyright 2024 DXOS.org
//

import { type ForwardRefExoticComponent, type RefAttributes, lazy } from 'react';

import { type TableContainerProps } from './TableContainer';

export type { TableContainerProps };

export const TableCard = lazy(() => import('./TableCard'));
export const TableContainer: ForwardRefExoticComponent<TableContainerProps & RefAttributes<HTMLDivElement>> = lazy(
  () => import('./TableContainer'),
) as any;
