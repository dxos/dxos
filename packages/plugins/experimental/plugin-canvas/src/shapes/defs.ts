//
// Copyright 2024 DXOS.org
//

import { beaconShape } from './Beacon';
import { ellipseShape } from './Ellipse';
import { functionShape } from './Function';
import { rectangleShape } from './Rectangle';
import { switchShape } from './Switch';
import { type ShapeDef } from '../components';

export const defaultShapes: ShapeDef<any>[] = [
  //
  rectangleShape,
  ellipseShape,
  functionShape,
  switchShape,
  beaconShape,
];
