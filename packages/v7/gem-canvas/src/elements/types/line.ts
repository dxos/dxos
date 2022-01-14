//
// Copyright 2022 DXOS.org
//

import { Modifiers, Scale, FractionUtil, Point, Screen } from '@dxos/gem-x';

import { ElementType, Line } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement, ControlPoint } from '../base';
import { createControlPoints } from '../frame';

/**
 * Hidden bounds for click handler.
 * @param pos1
 * @param pos2
 */
const createHidden = (pos1: Point, pos2: Point) => {
  const hyp = Screen.len(pos1, pos2);
  const adj = pos1[0] - pos2[0];
  const opp = pos1[1] - pos2[1];
  const bounds = {
    x: adj > 0 ? pos2[0] : pos1[0],
    y: adj > 0 ? pos2[1] : pos1[1],
    width: hyp,
    height: 8
  };

  const theta = (adj === 0) ? (opp < 0 ? 90 : 270) : Math.atan(opp / adj) * (180 / Math.PI);
  return { theta, bounds };
};

/**
 * Renderer.
 * @param scale
 */
const createLine = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: BaseElement<Line>) => {
    const { pos1, pos2 } = base.data;
    const [x1, y1] = scale.model.toPoint(pos1);
    const [x2, y2] = scale.model.toPoint(pos2);

    // eslint-disable indent
    group
      .selectAll('line')
      .data(['_main_'])
      .join('line')
      .attr('x1', x1)
      .attr('y1', y1)
      .attr('x2', x2)
      .attr('y2', y2);

    // Hidden bounds.
    const { theta, bounds } = createHidden([x1, y1], [x2, y2]);
    const { x, y, height } = bounds;

    // Hidden Rect to enable selection.
    group
      .selectAll('rect.line-touch')
      .data([bounds])
      .join('rect')
      .classed('line-touch', true)
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#rotate
      .attr('transform', `translate(0, -${height / 2}) rotate(${theta}, ${x}, ${y + height / 2})`)
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('cursor', 'default')
      .on('click', () => {
        base.onSelect(true);
      });
    // eslint-enable indent
  };
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Line, commit: boolean) => {
  if (commit) {
    const { pos1, pos2 } = data;
  }

  return data;
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
 */
export class LineElement extends BaseElement<Line> {
  _handles = createControlPoints(this.scale);
  _main = createLine(this.scale);

  type = 'line' as ElementType;

  override drawable (): D3Callable {
    return group => {
      group.call(this._main, group.datum());
      group.call(this._handles, group.datum(), this.selected, this.selected && this.resizable);
    };
  }

  override createFromExtent (p1: Point, p2: Point, mod?: Modifiers, commit?: boolean): Line {
    return {
      pos1: this.scale.screen.toVertex(p1),
      pos2: this.scale.screen.toVertex(p2)
    };
  }

  override getControlPoints (): ControlPoint[] {
    const { pos1, pos2 } = this.data;
    return [pos1, pos2].map((p, i) => ({ i, point: this.scale.model.toPoint(p) }));
  }

  override updateControlPoint ({ i, point }: ControlPoint, delta: Point, commit?: boolean) {
    const { x: dx, y: dy } = this.scale.screen.toVertex(delta);
    const { pos1, pos2, ...rest } = this.element.data;
    const points = [pos1, pos2];

    const snap = commit ? this.scale.model.snapVertex : p => p;
    points[i] = snap({
      x: FractionUtil.add(points[i].x, dx),
      y: FractionUtil.add(points[i].y, dy)
    });

    return {
      pos1: points[0],
      pos2: points[1],
      ...rest
    };
  }
}
