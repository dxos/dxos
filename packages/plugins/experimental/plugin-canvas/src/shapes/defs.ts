//
// Copyright 2024 DXOS.org
//

import { ellipseShape } from './Ellipse';
import { rectangleShape } from './Rectangle';
import { andShape, orShape, notShape, functionShape, switchShape, timerShape, beaconShape } from './compute';
import { type ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const defaultShapes: ShapeDef<any>[] = [
  rectangleShape,
  ellipseShape,
  functionShape,
  switchShape,
  timerShape,
  andShape,
  orShape,
  notShape,
  beaconShape,
];
