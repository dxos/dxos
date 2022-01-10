//
// Copyright 2022 DXOS.org
//

import { ViewBounds, Point, Scale } from '@dxos/gem-x';

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
    const [cx, cy] = scale.mapPointToScreen([data.cx, data.cy]);
    const [rx, ry] = scale.mapToScreen([data.rx, data.ry]);

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
              const [dx, dy] = scale.mapToModel(delta, commit);
              const { cx, cy, rx, ry } = data;
              base.onSelect(true);
              base.onUpdate({
                cx: FractionUtil.add(cx, dx),
                cy: FractionUtil.add(cy, dy),
                rx,
                ry
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
    let { x, y, width, height } = bounds;
    if (mod?.constrain) {
      // TODO(burdon): Maintain aspect (not square).
      width = height = Math.max(width, height);
    }

    // TODO(burdon): Center relative to original center.
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
  }

  createBounds (): ViewBounds {
    const { cx, cy, rx, ry } = this.data;
    const { x, y, width, height } = this.scale.mapBoundsToScreen({
      x: FractionUtil.subtract(cx, rx),
      y: FractionUtil.subtract(cy, ry),
      width: FractionUtil.multiply(rx, 2),
      height: FractionUtil.multiply(ry, 2)
    });

    return { x, y, width, height };
  }

  // TODO(burdon): Generic.
  draw (): D3Callable {
    return group => {
      group.call(this._main, group.datum());
      group.call(this._frame, group.datum(), this.selected, this.selected && this.resizable);
    };
  }
}
