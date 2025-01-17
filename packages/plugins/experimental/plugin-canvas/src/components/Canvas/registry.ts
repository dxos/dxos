//
// Copyright 2024 DXOS.org
//

import { type FC } from 'react';

import { invariant } from '@dxos/invariant';

import { type ShapeComponentProps } from './Shape';
import { type Polygon } from '../../types';
import { type Anchor } from '../anchors';

/**
 * Shape definition.
 */
export type ShapeDef<S extends Polygon> = {
  type: string;
  icon: string;
  component: FC<ShapeComponentProps<S>>;
  createShape: (props: Pick<S, 'id' | 'center'>) => S;
  getAnchors?: (shape: S) => Record<string, Anchor>;
  resizeable?: boolean;
};

export type ShapeDefSet = { title?: string; shapes: ShapeDef<any>[] };

/**
 * Shape registry may be provided to the Editor.
 */
export class ShapeRegistry {
  private readonly _registry = new Map<string, ShapeDef<Polygon>>();

  constructor(private readonly _defs: ShapeDefSet[] = []) {
    this._defs.forEach(({ shapes }) => shapes.forEach((shape) => this.registerShapeDef(shape)));
  }

  createShape<S extends Polygon>(type: string, props: Pick<Polygon, 'id' | 'center'>): S {
    const def = this.getShapeDef(type);
    invariant(def, `unregistered type: ${type}`);
    return def.createShape(props) as S;
  }

  get defs(): ShapeDefSet[] {
    return this._defs;
  }

  get shapes(): ShapeDef<any>[] {
    return Array.from(this._registry.values());
  }

  getShapeDef(type: string) {
    return this._registry.get(type);
  }

  registerShapeDef(shape: ShapeDef<Polygon>) {
    this._registry.set(shape.type, shape);
  }
}
