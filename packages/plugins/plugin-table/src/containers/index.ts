//
// Copyright 2024 DXOS.org
//

import { type ForwardRefExoticComponent, lazy } from 'react';

import { type TableContainerProps } from './TableContainer';

export type { TableContainerProps };

export const TableCard = lazy(() => import('./TableCard'));
export const TableContainer: ForwardRefExoticComponent<TableContainerProps> = lazy(() => import('./TableContainer'));
