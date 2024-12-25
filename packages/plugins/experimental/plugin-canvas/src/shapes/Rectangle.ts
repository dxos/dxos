//
// Copyright 2024 DXOS.org
//

import { DefaultFrameComponent } from './Default';
import { type ShapeComponentProps, type ShapeDef } from '../components';
import { createId } from '../testing';
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

export const rectangleShape: ShapeDef = {
  type: 'rectangle',
  icon: 'ph--rectangle--regular',
  component: DefaultFrameComponent,
  create: () => createRectangle({ id: createId(), center: { x: 0, y: 0 }, size: { width: 128, height: 64 } }),
};
