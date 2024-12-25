//
// Copyright 2024 DXOS.org
//

import type { ShapeComponentProps, ShapeDef } from '../components';
import { createId } from '../testing';
import { type EllipseShape } from '../types';

export type CreateEllipseProps = Omit<EllipseShape, 'type'>;

export const createEllipse = ({ id, ...rest }: CreateEllipseProps): EllipseShape => ({
  id,
  type: 'ellipse',
  ...rest,
});

export const EllipseComponent = ({ shape }: ShapeComponentProps<EllipseShape>) => {
  return null;
};

export const ellipseShape: ShapeDef<EllipseShape> = {
  type: 'ellipse',
  icon: 'ph--circle--regular',
  component: EllipseComponent,
  create: () => createEllipse({ id: createId(), center: { x: 0, y: 0 }, size: { width: 128, height: 128 } }),
};
