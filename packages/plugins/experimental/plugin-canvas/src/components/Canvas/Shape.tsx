//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { Frame } from './Frame';
import { useEditorContext } from '../../hooks';
import { PathComponent } from '../../shapes';
import { isPath, isPolygon, type Shape } from '../../types';

export const DEFS_ID = 'dx-defs';
export const MARKER_PREFIX = 'dx-marker';

export const DATA_SHAPE_ID = 'data-shape-id';
export const DATA_SHAPE_TYPE = 'data-shape-type';

export const shapeAttrs = (shape: Shape) => {
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
export type ShapeComponentProps<S extends Shape> = PropsWithChildren<
  ThemedClassName<{
    shape: S;
    debug?: boolean;
    scale: number; // TODO(burdon): Remove.
    selected?: boolean;
    onSelect?: (id: string, shift: boolean) => void;
  }>
>;

export const ShapeComponent = (props: ShapeComponentProps<any>) => {
  const { registry } = useEditorContext();
  const { shape } = props;
  if (isPolygon(shape)) {
    const component = registry.getShape(shape.type)?.component;
    return <Frame {...props} Component={component} />;
  }
  if (isPath(shape)) {
    return <PathComponent {...props} />;
  }

  return null;
};
