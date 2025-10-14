//
// Copyright 2025 DXOS.org
//

import { cardStackDefaultInlineSizeRem } from '@dxos/react-ui-stack';

import { type BoardGeometry } from './geometry';
import { type BoardLayout } from './types';

export const defaultGrid: BoardGeometry = {
  size: { width: cardStackDefaultInlineSizeRem, height: cardStackDefaultInlineSizeRem },
  gap: 1,
  overScroll: 0,
};

export const defaultLayout: BoardLayout = { size: { width: 7, height: 5 }, cells: {} };
