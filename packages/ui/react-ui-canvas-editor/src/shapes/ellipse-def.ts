//
// Copyright 2024 DXOS.org
//

import { type ShapeDef } from '../components/index.ts';
import { type EllipseShape } from '../types/index.ts';
import { EllipseComponent } from './Ellipse.tsx';

// Kept out of `Ellipse.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the factory and shape def exported beside one force a full page reload on every edit.

export type CreateEllipseProps = Omit<EllipseShape, 'type'>;

export const createEllipse = ({ id, ...rest }: CreateEllipseProps): EllipseShape => ({
  id,
  type: 'ellipse',
  ...rest,
});

export const ellipseShape: ShapeDef<EllipseShape> = {
  type: 'ellipse',
  name: 'Ellipse',
  icon: 'ph--circle--regular',
  component: EllipseComponent,
  createShape: ({ id, center }) => createEllipse({ id, center, size: { width: 128, height: 128 } }),
  resizable: true,
};
