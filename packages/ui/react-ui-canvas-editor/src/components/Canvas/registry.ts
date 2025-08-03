//
// Copyright 2024 DXOS.org
//

import { type FC } from 'react';

import { invariant } from '@dxos/invariant';

import { type Polygon, type Shape } from '../../types';
import { type Anchor } from '../anchors';

import { type ShapeComponentProps } from './Shape';

/**
 * Shape definition.
 */
export type ShapeDef<S extends Shape = any> = {
  type: string;
  name: string;
  icon: string;
  component: FC<ShapeComponentProps<S>>;
  createShape: (props: Pick<Polygon, 'id' | 'center'>) => S;
  getAnchors?: (shape: S) => Record<string, Anchor>;
  openable?: boolean;
  resizable?: boolean;
};

export type ShapeDefSet<S extends Shape = any> = { title?: string; shapes: ShapeDef<S>[] };

/**
 * Shape registry provided to the Editor.
 */
export class ShapeRegistry {
  private readonly _registry = new Map<string, ShapeDef>();

  constructor(private readonly _defs: ShapeDefSet[] = []) {
    this._defs.forEach(({ shapes }) => shapes.forEach((shape) => this.registerShapeDef(shape)));
  }

  get defs(): ShapeDefSet[] {
    return this._defs;
  }

  get shapes(): ShapeDef[] {
    return Array.from(this._registry.values());
  }

  createShape<S extends Polygon>(type: string, props: Pick<Polygon, 'id' | 'center'>): S {
    const shapeDef = this.getShapeDef(type);
    invariant(shapeDef, `unregistered type: ${type}`);
    return shapeDef.createShape(props) as S;
  }

  getShapeDef(type: string): ShapeDef | undefined {
    return this._registry.get(type);
  }

  registerShapeDef(shape: ShapeDef): void {
    this._registry.set(shape.type, shape);
  }
}

/**
 * Layout helper.
 */
export class ShapeLayout {
  constructor(protected readonly _registry: ShapeRegistry) {}

  getAnchors(shape: Shape): Record<string, Anchor> {
    const shapeDef = this._registry.getShapeDef(shape.type);
    return shapeDef?.getAnchors?.(shape) ?? {};
  }
}
