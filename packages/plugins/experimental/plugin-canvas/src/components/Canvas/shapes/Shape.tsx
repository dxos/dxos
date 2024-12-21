//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Frame } from './Frame';
import { Line } from './Line';
import { isPolygon, type BaseShape } from '../../../types';

export const DEFS_ID = 'dx-defs';
export const MARKER_PREFIX = 'dx-marker';

export const shapeAttrs = (shape: BaseShape) => ({ 'data-shape-id': shape.id });

export const getShapeElement = (root: HTMLDivElement, id: string) => root.querySelector(`[data-shape-id="${id}"]`);
export const getShapeBounds = (root: HTMLDivElement, id: string): DOMRect | undefined => {
  const el = getShapeElement(root, id);
  return el ? el.getClientRects()[0] : undefined;
};

/**
 * Runtime representations of shape.
 */
export type BaseShapeProps<S extends BaseShape> = PropsWithChildren<
  ThemedClassName<{
    shape: S;
    scale: number;
    selected?: boolean;
    onSelect?: (id: string, shift: boolean) => void;
  }>
>;

export const ShapeComponent = (props: BaseShapeProps<any>) => {
  const { shape } = props;
  if (isPolygon(shape)) {
    return <Frame {...props} />;
  }

  switch (shape.type) {
    case 'line': {
      return <Line {...props} />;
    }

    default:
      return null;
  }
};
