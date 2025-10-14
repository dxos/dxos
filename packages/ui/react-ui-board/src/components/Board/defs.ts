//
// Copyright 2025 DXOS.org
//

import { cardDefaultInlineSize } from '@dxos/react-ui-stack';

import { type BoardGeometry } from './geometry';
import { type BoardLayout } from './types';

const defaultGap = 1;

export const defaultGrid: BoardGeometry = {
  size: {
    width: cardDefaultInlineSize,
    height: cardDefaultInlineSize,
  },
  gap: defaultGap,
  overScroll: 0,
};

export const defaultLayout: BoardLayout = { size: { width: 7, height: 5 }, cells: {} };
