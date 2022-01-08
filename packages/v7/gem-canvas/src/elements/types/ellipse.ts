//
// Copyright 2022 DXOS.org
//

import { Bounds, Frac, Point, Scale } from '@dxos/gem-x';

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
    const [cx, cy, rx, ry] = scale.mapToScreen([data.cx, data.cy, data.rx, data.ry]);

    // eslint-disable indent
    group.selectAll('ellipse').data(['_main_']).join('ellipse')
      // TODO(burdon): Generic/reusable handler.
      .call(selection => {
        // Select.
        if (base.onSelect) {
          selection
            .on('click', base.onSelect.bind(base));
        }

        // Move.
        if (base.onUpdate) {
          selection
            .call(dragMove((delta: Point, mod: EventMod, commit?: boolean) => {
              const [dx, dy] = scale.mapToModel(delta, commit);
              const { cx, cy, rx, ry } = data;
              base.onUpdate({
                cx: Frac.add(cx, dx),
                cy: Frac.add(cy, dy),
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
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
 */
export class EllipseElement extends BaseElement<Ellipse> {
  _frame = createFrame();

  _ellipse = createEllipse(this.scale);

  type = 'ellipse' as ElementType;

  createData (bounds: Bounds, mod?: EventMod, snap?: boolean): Ellipse {
    const { x, y, width, height } = bounds;

    // TODO(burdon): Constrain (maintain aspect).
    // TODO(burdon): Center relative to original center.

    if (mod?.center) {
      const { cx, cy } = this.data;
      const size = [width / 2, height / 2];
      const [rx, ry] = this.scale.mapToModel(size, snap);
      return { cx, cy, rx, ry };
    } else {
      const pos: Point = [x + width / 2, y + height / 2];
      const size = [width / 2, height / 2];
      const [cx, cy] = this.scale.mapToModel(pos, snap);
      const [rx, ry] = this.scale.mapToModel(size, snap);
      return { cx, cy, rx, ry };
    }
  }

  createBounds (): Bounds {
    const { cx, cy, rx, ry } = this.data;
    const [x, y, width, height] = this.scale.mapToScreen([
      Frac.add(cx, -rx),
      Frac.add(cy, -ry),
      Frac.multiply(rx, 2),
      Frac.multiply(ry, 2)
    ]);

    return { x, y, width, height };
  }

  draw (): D3Callable {
    return group => {
      group.call(this._ellipse, group.datum());
      group.call(this._frame, group.datum(), this.selected, this.selected);
    };
  }
}
