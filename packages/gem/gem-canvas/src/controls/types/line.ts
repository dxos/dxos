//
// Copyright 2022 DXOS.org
//

import { D3Callable, D3Selection, Modifiers, Scale, FractionUtil, Point, Screen, Vertex } from '@dxos/gem-core';

import { ElementId, ElementType, Line } from '../../model';
import { Control, ControlGetter } from '../control';
import { Connection, ControlHandle, createControlHandles } from '../frame';

/**
 * Hidden bounds for click handler.
 * @param pos1
 * @param pos2
 */
const createHidden = (pos1: Point, pos2: Point) => {
  const w = 20;

  const hyp = Screen.len(pos1, pos2);
  const adj = pos1[0] - pos2[0];
  const opp = pos1[1] - pos2[1];
  const bounds = {
    x: (adj > 0 ? pos2[0] : pos1[0]),
    y: (adj > 0 ? pos2[1] : pos1[1]),
    width: hyp + w / 2,
    height: w
  };

  const theta =  (adj === 0) ? (opp < 0 ? Math.PI / 2 : Math.PI * 3 / 2) : Math.atan(opp / adj);

  // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/transform#rotate
  const transform = `rotate(${theta * 180 / Math.PI}, ${bounds.x}, ${bounds.y}) translate(${-w / 4}, ${-w / 2})`;

  return { bounds, transform };
};

/**
 * Renderer.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/line
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/polyline
 * @param cache
 * @param scale
 */
const createLine = (cache: ControlGetter, scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<Line>) => {
    let { source, target } = control.data;

    const pos1 = getPos(cache, source);
    const pos2 = getPos(cache, target);

    // Dangling reference.
    if (!pos1 || !pos2) {
      return;
    }

    const [x1, y1] = scale.model.toPoint(pos1);
    const [x2, y2] = scale.model.toPoint(pos2);

    // eslint-disable indent
    group
      .selectAll('line')
        .data(['main'])
        .join('line')
        .attr('marker-end', () => 'url(#marker_arrow)')
        .style('pointer-events', 'none')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2);

    // TODO(burdon): Convert to polyline with multiple hidden rects.
    /*
    const points = [[x1, y1], [x2, y2]];
    group
      .selectAll('polyline')
      .data(['main'])
      .join('polyline')
      .attr('marker-end', () => 'url(#marker_arrow)')
      .attr('points', points.map(([x, y]) => `${x},${y}`).join(' '));
    */

    // Hidden Rect to enable selection.
    const { bounds, transform } = createHidden([x1, y1], [x2, y2]);

    // TODO(burdon): Replace with path (see draw.io):
    //  fill="none" stroke-miterlimit="10" pointer-events="stroke" visibility="hidden" stroke-width="9"
    group
      .selectAll('rect.line-touch')
        .data(control.active ? [] : [bounds])
        .join('rect')
        .attr('class', 'line-touch')
        .attr('transform', transform)
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('width', d => d.width)
        .attr('height', d => d.height)
        .style('cursor', 'default')
        .on('click', function () {
          control.onSelect(true);
        });
    // eslint-enable indent
  };
};

// TODO(burdon): Get other point (or approximation) to determine which connection point.
// TODO(burdon): If no position then auto-select.
const getPos = (cache, { pos, id, handle }: { pos?: Vertex, id?: ElementId, handle?: string } = {}): Vertex => {
  if (pos) {
    return pos;
  }

  const control: Control<any> = cache.getControl(id);
  return control?.getConnectionPoint(handle);
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Line, commit: boolean) => {
  if (commit) {
    const { source: { pos: pos1 }, target: { pos: pos2 } } = data;
    if (FractionUtil.equals(pos1.x, pos2.x) && FractionUtil.equals(pos1.y, pos2.y)) {
      return;
    }
  }

  return data;
};

/**
 * Line control.
 */
export class LineControl extends Control<Line> {
  _handles = createControlHandles(this.scale);
  _main = createLine(this.elements, this.scale);

  override type = 'line' as ElementType;

  override drawable: D3Callable = group => {
    group.call(this._handles, group.datum(), this.selected, this.selected && this.resizable);
    group.call(this._main, group.datum());
  };

  override createFromExtent (p1: Point, p2: Point, mod?: Modifiers, commit?: boolean): Line {
    return valid({
      source: {
        pos: this.scale.screen.toVertex(p1)
      },
      target: {
        pos: this.scale.screen.toVertex(p2)
      }
    }, commit);
  }

  override getControlPoints (): ControlHandle[] {
    let { source, target } = this.data;
    const pos1 = getPos(this.elements, source);
    const pos2 = getPos(this.elements, target);
    return [pos1, pos2].filter(Boolean).map((p, i) => ({ i, point: this.scale.model.toPoint(p) }));
  }

  override updateControlPoint (
    { i, point }: ControlHandle,
    delta: Point,
    commit?: boolean,
    connection?: Connection
  ) {
    const { x: dx, y: dy } = this.scale.screen.toVertex(delta);
    let { source, target, ...rest } = this.element.data;
    const pos1 = getPos(this.elements, source);
    const pos2 = getPos(this.elements, target);
    const points = [pos1, pos2];

    // Connect.
    if (commit) {
      if (i === 0) {
        source = connection;
      } else {
        target = connection;
      }
    }

    const snap = commit ? this.scale.model.snapVertex : p => p;
    points[i] = snap({
      x: FractionUtil.add(points[i].x, dx),
      y: FractionUtil.add(points[i].y, dy)
    });

    return {
      source: {
        ...source,
        pos: (!commit || !source?.id) ? points[0] : undefined
      },
      target: {
        ...target,
        pos: (!commit || !target?.id) ? points[1] : undefined
      },
      ...rest
    };
  }
}
