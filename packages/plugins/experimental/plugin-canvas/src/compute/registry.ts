//
// Copyright 2025 DXOS.org
//

import { functionShape, switchShape, timerShape, andShape, orShape, notShape, beaconShape } from './shapes';
import type { ShapeDef } from '../components';

/**
 * Order used by toolbar.
 */
export const computeShapes: ShapeDef<any>[] = [
  functionShape,
  switchShape,
  timerShape,
  andShape,
  orShape,
  notShape,
  beaconShape,
];
