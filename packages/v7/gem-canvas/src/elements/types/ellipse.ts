//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { Bounds, Frac, Point, Scale } from '@dxos/gem-x';

import { Ellipse } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement } from '../base';
import { dragMove } from '../drag';
import { createFrame } from '../frame';

/*
export const dragEllipse = ({ scale, onCancel, onCreate }: DragElementProps<Ellipse>): D3Callable => {
  return dragBounds(scale, (event: D3DragEvent, bounds: Bounds, commit?: boolean) => {
    // TODO(burdon): If shift then constain circle.
    const data = createData(scale, bounds, event.sourceEvent.metaKey, commit);
    const { rx, ry } = data;
    if (commit && (rx < 0.5 || ry < 0.5)) { // TODO(burdon): Zoom specific?
      onCancel();
    } else {
      onCreate('ellipse', data, commit);
    }
  });
};
*/

const createEllipse = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: BaseElement<Ellipse>) => {
    const { data } = base.element;
    const [cx, cy, rx, ry] = scale.mapToScreen([data.cx, data.cy, data.rx, data.ry]);

    // eslint-disable indent
    group.selectAll('ellipse').data(['_main_']).join('ellipse')
      .call(selection => {
        selection
          .on('click', base.onSelect.bind(base))
          .call(dragMove((delta: Point, commit?: boolean) => {
            const [dx, dy] = scale.mapToModel(delta, commit);
            const { cx, cy, rx, ry } = data;
            base.element.data = {
              cx: Frac.add(cx, dx),
              cy: Frac.add(cy, dy),
              rx,
              ry
            };

            base.onUpdate();
          }));
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
  _ellipse = createEllipse(this.scale);
  _frame = createFrame();

  createData (bounds: Bounds, constrain: boolean, center: boolean, snap: boolean): Ellipse {
    const { x, y, width, height } = bounds;

    // TODO(burdon): Need to keep original size (Don't change element.data until commit).

    // TODO(burdon): Constrain (keep aspect).
    if (center) {
      // TODO(burdon): Relative to original center.
      const { cx, cy } = this.element.data;
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
    const { data: { cx, cy, rx, ry } } = this.element;
    const [x, y, width, height] = this.scale.mapToScreen([
      Frac.add(cx, -rx),
      Frac.add(cy, -ry),
      Frac.multiply(rx, 2),
      Frac.multiply(ry, 2)
    ]);

    return { x, y, width, height };
  }

  updateBounds (bounds: Bounds, constrain?: boolean, center?: boolean, commit?: boolean) {
    this.element.data = this.createData(bounds, constrain, center, commit);
    this.onUpdate();
  }

  drag (): D3Callable {
    return group => group.call(d3.drag());
  }

  draw (): D3Callable {
    return group => {
      group.call(this._ellipse, group.datum());
      group.call(this._frame, group.datum(), this.selected, this.selected);
    };
  }
}
