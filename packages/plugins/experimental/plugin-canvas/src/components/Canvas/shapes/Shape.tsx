//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Frame } from './Frame';
import { Line } from './Line';
import { type PolygonShape, isPolygon, type BaseShape } from '../../../types';

export const DEFS_ID = 'dx-defs';
export const MARKER_PREFIX = 'dx-marker';

/**
 * Data associated with a draggable.
 */
export type DragPayloadData<S extends PolygonShape = PolygonShape> = {
  type: 'frame' | 'anchor' | 'tool';
  anchor?: string; // TODO(burdon): id.
  shape: S;
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
