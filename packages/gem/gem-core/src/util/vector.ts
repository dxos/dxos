//
// Copyright 2020 DXOS.org
//

import { Num, Fraction, FractionUtil } from './fraction';

export type Vertex = { x: Fraction; y: Fraction };

export type Bounds = {
  x: Fraction;
  y: Fraction;
  width: Fraction;
  height: Fraction;
};

export class Vector {
  /**
   * Convert to Vertex.
   * @param x
   * @param y
   */
  static toVertex = ({ x, y }: { x: Num; y: Num }): Vertex => ({
    x: FractionUtil.toFraction(x),
    y: FractionUtil.toFraction(y)
  });

  /**
   * Convert to Bounds.
   * @param bounds
   */
  static toBounds = ({
    x,
    y,
    width,
    height
  }: {
    x: Num;
    y: Num;
    width: Num;
    height: Num;
  }): Bounds => ({
    x: FractionUtil.toFraction(x),
    y: FractionUtil.toFraction(y),
    width: FractionUtil.toFraction(width),
    height: FractionUtil.toFraction(height)
  });

  /**
   * Calculate center point.
   * @param bounds
   */
  static center = ({ x, y, width, height }: Bounds): Vertex => {
    const cx = FractionUtil.add(x, FractionUtil.multiply(width, [1, 2]));
    const cy = FractionUtil.add(y, FractionUtil.multiply(height, [1, 2]));
    return { x: cx, y: cy };
  };

  /**
   * Calculate centered left edge.
   * @param bounds
   */
  static left = ({ x, y, height }: Bounds): Vertex => {
    const cx = x;
    const cy = FractionUtil.add(y, FractionUtil.multiply(height, [1, 2]));
    return { x: cx, y: cy };
  };

  /**
   * Calculate centered right edge.
   * @param bounds
   */
  static right = ({ x, y, width, height }: Bounds): Vertex => {
    const cx = FractionUtil.add(x, width);
    const cy = FractionUtil.add(y, FractionUtil.multiply(height, [1, 2]));
    return { x: cx, y: cy };
  };
}
