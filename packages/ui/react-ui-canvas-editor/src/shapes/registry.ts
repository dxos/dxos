//
// Copyright 2024 DXOS.org
//

import { type ShapeDefSet } from '../components';

import { ellipseShape } from './Ellipse';
import { rectangleShape } from './Rectangle';

/**
 * Order used by toolbar.
 */
export const defaultShapes: ShapeDefSet[] = [{ title: 'Default', shapes: [rectangleShape, ellipseShape] }];
