//
// Copyright 2024 DXOS.org
//

import { type DxGrid } from '@dxos/lit-grid';

export type AxisMeta = {
  size: number;
};

export type GridProps = {
  title: string;
  cells: DxGrid['values'];
  rowMeta?: Record<string, AxisMeta>;
  colMeta?: Record<string, AxisMeta>;
};
