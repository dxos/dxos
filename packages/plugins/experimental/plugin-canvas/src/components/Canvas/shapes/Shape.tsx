//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Frame } from './Frame';
import { Function } from './Function';
import { Path } from './Path';
import { isPolygon, type BaseShape, type PolygonShape } from '../../../types';

export const DEFS_ID = 'dx-defs';
export const MARKER_PREFIX = 'dx-marker';

export const DATA_SHAPE_ID = 'data-shape-id';
export const DATA_SHAPE_TYPE = 'data-shape-type';

export const shapeAttrs = (shape: BaseShape) => {
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

export const getShapeElement = (root: HTMLDivElement, id: string): Element | null =>
  root.querySelector(`[${DATA_SHAPE_ID}="${id}"]`);

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
    let component: FC<BaseShapeProps<PolygonShape>> | undefined;
    switch (shape.type) {
      case 'function': {
        component = Function as any; // TODO(burdon): This satisfies PolygonShape.
        break;
      }
    }

    return <Frame {...props} Component={component} />;
  }

  switch (shape.type) {
    case 'path': {
      return <Path {...props} />;
    }

    default:
      return null;
  }
};
