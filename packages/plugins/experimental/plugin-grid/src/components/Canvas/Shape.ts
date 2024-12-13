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

/**
 * Data associated with a drag event.
 */
export type DragPayloadData = {
  type: 'frame' | 'anchor';
  item: Item;
  anchor?: string;
};

export abstract class Shape {}

export class CircleShape implements Shape {}

export class RectangleShape implements Shape {}
