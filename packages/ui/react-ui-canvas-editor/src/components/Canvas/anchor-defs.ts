//
// Copyright 2024 DXOS.org
//

import { type Dimension } from '@dxos/react-ui-canvas';

import { type CanvasBoard } from '../../types/index.ts';
import { type Anchor } from '../anchors.ts';

// Kept out of `Anchor.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so constants and helpers exported beside them force a full page reload on every edit.

export const defaultAnchorSize: Dimension = { width: 8, height: 8 };

export const DATA_ANCHOR_ID = 'data-anchor-id';

export const anchorAttrs = (shape: CanvasBoard.Shape, anchor: Anchor) => {
  return {
    [DATA_ANCHOR_ID]: `${shape.id}-${anchor.id}`,
  };
};

export const getAnchorElement = (root: HTMLElement, shapeId: string, anchorId: string): Element | null =>
  root.querySelector(`[${DATA_ANCHOR_ID}="${shapeId}-${anchorId}"]`);
