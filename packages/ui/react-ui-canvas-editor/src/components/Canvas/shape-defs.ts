//
// Copyright 2024 DXOS.org
//

import { type CanvasBoard } from '../../types/index.ts';

// Kept out of `Shape.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so constants and helpers exported beside them force a full page reload on every edit.

export const DEFS_ID = 'dx-defs';
export const MARKER_PREFIX = 'dx-marker';

export const DATA_SHAPE_ID = 'data-shape-id';
export const DATA_SHAPE_TYPE = 'data-shape-type';

export const shapeAttrs = (shape: CanvasBoard.Shape) => {
  return {
    [DATA_SHAPE_ID]: shape.id,
    [DATA_SHAPE_TYPE]: shape.type,
  };
};

export const getShapeElements = <E extends Element>(el: HTMLElement, type: string): E[] => {
  const elements: E[] = [];
  el.querySelectorAll(`[${DATA_SHAPE_TYPE}="${type}"]`).forEach((el) => elements.push(el as E));
  return elements;
};

export const getShapeElement = (root: HTMLElement, id: string): HTMLElement | null =>
  root.querySelector(`[${DATA_SHAPE_ID}="${id}"]`);

export const getParentShapeElement = (root: HTMLElement, id: string): HTMLElement | null =>
  root.closest(`[${DATA_SHAPE_ID}="${id}"]`);

export const getShapeBounds = (root: HTMLElement, id: string): DOMRect | undefined => {
  const el = getShapeElement(root, id);
  return el ? el.getClientRects()[0] : undefined;
};
