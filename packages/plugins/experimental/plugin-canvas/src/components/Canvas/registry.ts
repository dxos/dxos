//
// Copyright 2024 DXOS.org
//

import type { FC } from 'react';

import { type Anchor } from './Anchor';
import { type ShapeComponentProps } from './Shape';
import { type DraggingState } from '../../hooks';
import { type Polygon } from '../../types';

export type ShapeDef<S extends Polygon = Polygon> = {
  type: string;
  icon: string;
  component: FC<ShapeComponentProps<any>>;
  create: () => Polygon;
  getAnchors?: (shape: S, linking?: DraggingState) => Anchor[];
};

export class ShapeRegistry {
  private readonly _registry: Map<string, ShapeDef>;

  constructor(shapes: ShapeDef[] = []) {
    this._registry = new Map<string, ShapeDef>(shapes.map((shape) => [shape.type, shape]));
  }

  get shapes(): ShapeDef[] {
    return Array.from(this._registry.values());
  }

  getShape(type: string) {
    return this._registry.get(type);
  }

  register(shape: ShapeDef) {
    this._registry.set(shape.type, shape);
  }
}
