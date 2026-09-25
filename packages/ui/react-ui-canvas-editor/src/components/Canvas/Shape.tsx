//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';

import { useEditorContext } from '../../hooks/index.ts';
import { PathComponent } from '../../shapes/index.ts';
import { type CanvasBoard, isPath, isPolygon } from '../../types/index.ts';
import { Frame } from './Frame.tsx';

/**
 * Runtime representations of shape.
 */
export type ShapeComponentProps<S extends CanvasBoard.Shape = CanvasBoard.Shape> = PropsWithChildren<
  ThemedClassName<{
    shape: S;
    debug?: boolean;
    selected?: boolean;
    onSelect?: (id: string, options?: { toggle?: boolean; shift?: boolean }) => void;
  }>
>;

export const ShapeComponent = (props: ShapeComponentProps<any>) => {
  const { registry } = useEditorContext();
  const { shape } = props;
  invariant(shape.type);

  if (isPolygon(shape)) {
    const { component, resizable } =
      registry.getShapeDef(shape.type) ?? raise(new Error(`ShapeDef not found for ${shape.type}`));
    return <Frame {...props} resizable={resizable} Component={component} />;
  }

  if (isPath(shape)) {
    return <PathComponent {...props} />;
  }

  return null;
};
