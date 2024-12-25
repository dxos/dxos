//
// Copyright 2024 DXOS.org
//

import { ellipseShape } from './Ellipse';
import { functionShape } from './Function';
import { rectangleShape } from './Rectangle';
import { type ShapeDef } from '../components';

export const defaultShapes: ShapeDef[] = [rectangleShape, ellipseShape, functionShape];
