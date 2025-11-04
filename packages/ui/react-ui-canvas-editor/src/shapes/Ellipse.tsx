//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ShapeComponentProps, type ShapeDef } from '../components';
import { type EllipseShape } from '../types';

export type CreateEllipseProps = Omit<EllipseShape, 'type'>;

export const createEllipse = ({ id, ...rest }: CreateEllipseProps): EllipseShape => ({
  id,
  type: 'ellipse',
  ...rest,
});

export const EllipseComponent = ({ shape }: ShapeComponentProps<EllipseShape>) => (
  <svg className='w-full h-full overflow-visible' viewBox='0 0 100 100' preserveAspectRatio='xMidYMid meet'>
    <circle cx={50} cy={50} r={50} className='stroke-current fill-none' />
  </svg>
);

export const ellipseShape: ShapeDef<EllipseShape> = {
  type: 'ellipse',
  name: 'Ellipse',
  icon: 'ph--circle--regular',
  component: EllipseComponent,
  createShape: ({ id, center }) => createEllipse({ id, center, size: { width: 128, height: 128 } }),
  resizable: true,
};
