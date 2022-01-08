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
  _main = createEllipse(this.scale);

  type = 'ellipse' as ElementType;

  createData (bounds: Bounds, mod?: EventMod, commit?: boolean): Ellipse {
    const { x, y, width, height } = bounds;

    const valid = (data: Ellipse, commit: boolean) => {
      if (commit) {
        const { rx, ry } = data;
        if (Frac.isZero(rx) || Frac.isZero(ry)) {
          return;
        }
      }

      return data;
    };

    // TODO(burdon): Constrain (maintain aspect).
    // TODO(burdon): Center relative to original center.

    if (mod?.center) {
      const { cx, cy } = this.data;
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

  createBounds (): Bounds {
    const { cx, cy, rx, ry } = this.data;
    const [x, y, width, height] = this.scale.mapToScreen([
      Frac.sub(cx, rx),
      Frac.sub(cy, ry),
      Frac.multiply(rx, 2),
      Frac.multiply(ry, 2)
    ]);

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
