//
// Copyright 2024 DXOS.org
//

import { createAnchorMap, defaultAnchors } from '../components/index.ts';
import { type ShapeDef } from '../components/index.ts';
import { type RectangleShape } from '../types/index.ts';
import { DefaultFrameComponent } from './Default.tsx';

export type CreateRectangleProps = Omit<RectangleShape, 'type'>;

export const createRectangle = ({ id, ...rest }: CreateRectangleProps): RectangleShape => ({
  id,
  type: 'rectangle',
  ...rest,
});

export const rectangleShape: ShapeDef<RectangleShape> = {
  type: 'rectangle',
  name: 'Rectangle',
  icon: 'ph--rectangle--regular',
  component: DefaultFrameComponent,
  createShape: ({ id, center }) => createRectangle({ id, center, size: { width: 128, height: 64 } }),
  getAnchors: (shape) => createAnchorMap(shape, defaultAnchors),
  resizable: true,
};
