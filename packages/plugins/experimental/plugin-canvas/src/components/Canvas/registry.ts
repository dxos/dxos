//
// Copyright 2024 DXOS.org
//

import { type FC } from 'react';

import { type Anchor } from './Anchor';
import { type ShapeComponentProps } from './Shape';
import { type Polygon } from '../../types';

// TODO(burdon): Create abstract base class.
export type ShapeDef<S extends Polygon> = {
  type: string;
  icon: string;
  component: FC<ShapeComponentProps<S>>;
  create: () => S;
  getAnchors?: (shape: S) => Record<string, Anchor>;
};

export class ShapeRegistry {
  private readonly _registry: Map<string, ShapeDef<any>>;

  constructor(shapes: ShapeDef<any>[] = []) {
    this._registry = new Map<string, ShapeDef<any>>(shapes.map((shape) => [shape.type, shape]));
  }

  get shapes(): ShapeDef<any>[] {
    return Array.from(this._registry.values());
  }

  getShape(type: string) {
    return this._registry.get(type);
  }

  register(shape: ShapeDef<any>) {
    this._registry.set(shape.type, shape);
  }
}
