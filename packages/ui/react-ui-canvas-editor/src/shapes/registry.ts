//
// Copyright 2024 DXOS.org
//

import { ellipseShape } from './Ellipse';
import { rectangleShape } from './Rectangle';
import { type ShapeDefSet } from '../components';

/**
 * Order used by toolbar.
 */
export const defaultShapes: ShapeDefSet[] = [{ title: 'Default', shapes: [rectangleShape, ellipseShape] }];
