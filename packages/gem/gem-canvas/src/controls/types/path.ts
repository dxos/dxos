//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { D3Callable, D3Selection, Point, Scale, FractionUtil } from '@dxos/gem-core';

import { ElementType, Path } from '../../model';
import { Control } from '../control';
import { Connection, ControlHandle, createControlHandles } from '../frame';

const curves: { [index: string]: any } = {
  'basis': [d3.curveBasis, d3.curveBasisClosed],
  'cardinal': [d3.curveCardinal, d3.curveCardinalClosed],
  'linear': [d3.curveLinear, d3.curveLinearClosed],
  'step': [d3.curveStep, d3.curveStep]
};

/**
 * Renderer.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/path
 * @param scale
 */
const createPath = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<Path>) => {
    const { curve, closed, points } = control.data;
    const p = points.map(p => scale.model.toPoint(p));
    const c = curves[curve][closed ? 1 : 0];
    const line = c ? d3.line().curve(c) : d3.line();

    // eslint-disable indent
    group
      .selectAll('path')
      .data(['main'])
      .join('path')
      .attr('d', line(p));
    // eslint-enable indent
  };
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Path, commit: boolean) => {
  if (commit) {
    const { points } = data;
  }

  return data;
};

/**
 * Path control.
 */
export class PathControl extends Control<Path> {
  _handles = createControlHandles(this.scale);
  _main = createPath(this.scale);

  type = 'path' as ElementType;

  override drawable: D3Callable = group => {
    group.call(this._main, group.datum());
    group.call(this._handles, group.datum(), this.selected, this.selected && this.resizable);
  };

  override getControlPoints (): ControlHandle[] {
    const { points } = this.data;
    return points.map((p, i) => ({ i, point: this.scale.model.toPoint(p) }));
  }

  override updateControlPoint ({ i, point }: ControlHandle, delta: Point, commit?: boolean, target?: Connection) {
    const { x: dx, y: dy } = this.scale.screen.toVertex(delta);
    const { points: p, ...rest } = this.element.data;

    const points = [...p];
    const snap = commit ? this.scale.model.snapVertex : p => p;
    points[i] = snap({
      x: FractionUtil.add(points[i].x, dx),
      y: FractionUtil.add(points[i].y, dy)
    });

    return {
      points,
      ...rest
    };
  }
}
