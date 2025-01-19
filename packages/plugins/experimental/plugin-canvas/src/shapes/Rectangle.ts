//
// Copyright 2024 DXOS.org
//

import { DefaultFrameComponent } from './Default';
import { defaultAnchors, createAnchorMap } from '../components';
import { type ShapeComponentProps, type ShapeDef } from '../components';
import { type RectangleShape } from '../types';

export type CreateRectangleProps = Omit<RectangleShape, 'type'>;

export const createRectangle = ({ id, ...rest }: CreateRectangleProps): RectangleShape => ({
  id,
  type: 'rectangle',
  ...rest,
});

export const RectangleComponent = ({ shape }: ShapeComponentProps<RectangleShape>) => {
  return null;
};

export const rectangleShape: ShapeDef<RectangleShape> = {
  type: 'rectangle',
  name: 'Rectangle',
  icon: 'ph--rectangle--regular',
  component: DefaultFrameComponent,
  createShape: ({ id, center }) => createRectangle({ id, center, size: { width: 128, height: 64 } }),
  getAnchors: (shape) => createAnchorMap(shape, defaultAnchors),
  resizable: true,
};
