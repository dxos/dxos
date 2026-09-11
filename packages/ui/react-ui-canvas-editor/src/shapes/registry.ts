//
// Copyright 2024 DXOS.org
//

import { type ShapeDefSet } from '../components/index.ts';
import { ellipseShape } from './ellipse-def.ts';
import { rectangleShape } from './Rectangle.tsx';

/**
 * Order used by toolbar.
 */
export const defaultShapes: ShapeDefSet[] = [{ title: 'Default', shapes: [rectangleShape, ellipseShape] }];
