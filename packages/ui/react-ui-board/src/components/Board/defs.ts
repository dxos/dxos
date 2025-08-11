//
// Copyright 2025 DXOS.org
//

import { type BoardGeometry } from './geometry';
import { type BoardLayout } from './types';

export const defaultGrid: BoardGeometry = { size: { width: 300, height: 300 }, gap: 16, overScroll: 0 };

export const defaultLayout: BoardLayout = { size: { width: 7, height: 5 }, cells: {} };
