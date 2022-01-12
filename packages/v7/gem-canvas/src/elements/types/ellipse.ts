//
// Copyright 2022 DXOS.org
//

import { Modifiers, FractionUtil, ScreenBounds, Point, Scale, Screen } from '@dxos/gem-x';

import { ElementType, Ellipse } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement } from '../base';
import { dragMove } from '../drag';
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
            .call(dragMove((delta: Point, mod: Modifiers, commit?: boolean) => {
              // TODO(burdon): Snap to edge unless mod (center).
              const { x: dx, y: dy } = scale.screen.toVertex(delta);
              const { center, ...rest } = data;
              const moved = {
                x: FractionUtil.add(center.x, dx),
                y: FractionUtil.add(center.y, dy)
              };

              base.onSelect(true);
              base.onUpdate({
                ...rest,
                center: commit ? scale.model.snapVertex(moved) : moved
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

  // TODO(burdon): Drag should first snap (screen), then find nearest fraction here.
  createData (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): Ellipse {
    if (commit) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    const center = this.scale.screen.toVertex(Screen.center(bounds));
    const { width, height } = this.scale.screen.toBounds(bounds);

    return valid({
      center,
      rx: FractionUtil.divide(width, [2, 1]),
      ry: FractionUtil.divide(height, [2, 1])
    }, commit);
  }

  createBounds (): ScreenBounds {
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
