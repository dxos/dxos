//
// Copyright 2024 DXOS.org
//

import type { Dimension, Point } from '../../layout';

/**
 * Graph data item.
 */
export type Item = {
  id: string;
  pos: Point;
  size: Dimension;
  text: string;
};

export abstract class Shape {}

export class CircleShape implements Shape {}

export class RectangleShape implements Shape {}
