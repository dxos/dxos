//
// Copyright 2024 DXOS.org
//

import { ellipseShape } from './Ellipse';
import { rectangleShape } from './Rectangle';
import { type ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const defaultShapes: ShapeDef<any>[] = [rectangleShape, ellipseShape];
