//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';

export const MapShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('map'),
  }),
);

export type MapShape = S.Schema.Type<typeof MapShape>;

export type CreateMapProps = CreateShapeProps<MapShape>;

export const createMap = (props: CreateMapProps) =>
  createShape<MapShape>({ type: 'map', size: { width: 256, height: 256 }, ...props });

export const MapComponent = ({ shape }: ShapeComponentProps<MapShape>) => {
  // const { runtime } = useComputeNodeState(shape);
  // const input = runtime.inputs[DEFAULT_INPUT];
  // const value = input?.type === 'executed' ? input.value : 0;

  return <Box shape={shape}></Box>;
};

export const mapShape: ShapeDef<MapShape> = {
  type: 'map',
  name: 'Map',
  icon: 'ph--compass--regular',
  component: MapComponent,
  createShape: createMap,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
};
