//
// Copyright 2022 DXOS.org
//

import { ViewBounds, Point, Scale, Screen, FractionUtil } from '@dxos/gem-x';

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
              const update = {
                x: FractionUtil.add(center.x, dx),
                y: FractionUtil.add(center.y, dy)
              };
              base.onSelect(true);
              base.onUpdate({
                ...rest,
                center: commit ? scale.model.snapVertex(update) : update
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
    if (commit) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    const center = this.scale.screen.toVertex(Screen.center(bounds));
    const { width, height } = this.scale.screen.toBounds(bounds);

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
