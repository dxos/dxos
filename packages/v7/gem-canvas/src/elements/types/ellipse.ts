//
// Copyright 2022 DXOS.org
//

import { ViewBounds, Point, Scale, FractionUtil, Vector } from '@dxos/gem-x';

import { ElementType, Ellipse } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement } from '../base';
import { EventMod, dragMove } from '../drag';
import { createFrame } from '../frame';

/**
 * Renderer.
 * @param scale
 */
const createEllipse = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: BaseElement<Ellipse>) => {
    const data = base.data;
    const [cx, cy] = scale.model.toPoint(data.center);
    const [rx, ry] = scale.model.toValues([data.rx, data.ry]);

    // eslint-disable indent
    return group.selectAll('ellipse')
      .data(['_main_'])
      .join('ellipse')
      .call(selection => {
        // Select.
        // TODO(burdon): Generic.
        if (base.onSelect) {
          selection
            .on('click', () => {
              base.onSelect(true);
            });
        }

        // Move.
        if (base.onUpdate) {
          selection
            .attr('cursor', 'move')
            .call(dragMove((delta: Point, mod: EventMod, commit?: boolean) => {
              const { x: dx, y: dy } = scale.screen.toVertex(delta);
              const { center, ...rest } = data;
              base.onSelect(true);
              base.onUpdate({
                ...rest,
                center: {
                  x: FractionUtil.add(center.x, dx),
                  y: FractionUtil.add(center.y, dy)
                }
              });
            }));
        }
      })
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('rx', rx)
      .attr('ry', ry);
    // eslint-enable indent
  };
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Ellipse, commit: boolean) => {
  if (commit) {
    const { rx, ry } = data;
    if (FractionUtil.isZero(rx) || FractionUtil.isZero(ry)) {
      return;
    }
  }

  return data;
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
 */
export class EllipseElement extends BaseElement<Ellipse> {
  _frame = createFrame();
  _main = createEllipse(this.scale);

  type = 'ellipse' as ElementType;

  createData (bounds: ViewBounds, mod?: EventMod, commit?: boolean): Ellipse {
    // let { x, y, width, height } = bounds;

    // TODO(burdon): Maintain aspect (not square).
    // if (mod?.constrain) {
    // width = height = Math.max(width, height);
    // }

    // TODO(burdon): Center relative to original center.
    /*
    if (mod?.center) {
      const { cx, cy } = this.data ?? { cx: x, cy: y };
      const size = [width / 2, height / 2];
      const [rx, ry] = this.scale.mapToModel(size, commit, 2);
      return valid({ cx, cy, rx, ry }, commit);
    } else {
      const pos: Point = [x + width / 2, y + height / 2];
      const size = [width / 2, height / 2];
      const [cx, cy] = this.scale.mapToModel(pos, commit, 2);
      const [rx, ry] = this.scale.mapToModel(size, commit, 2);
      return valid({ cx, cy, rx, ry }, commit);
    }
    */

    const b = this.scale.screen.toBounds(bounds);
    const center = Vector.center(b);
    const { width, height } = b;

    return {
      center,
      rx: FractionUtil.divide(width, [2, 1]),
      ry: FractionUtil.divide(height, [2, 1])
    };
  }

  createBounds (): ViewBounds {
    const { center: { x, y }, rx, ry } = this.data;
    return this.scale.model.toBounds({
      x: FractionUtil.subtract(x, rx),
      y: FractionUtil.subtract(y, ry),
      width: FractionUtil.multiply(rx, [2, 1]),
      height: FractionUtil.multiply(ry, [2, 1])
    });
  }

  // TODO(burdon): Generic.
  draw (): D3Callable {
    return group => {
      group.call(this._main, group.datum());
      group.call(this._frame, group.datum(), this.selected, this.selected && this.resizable);
    };
  }
}
