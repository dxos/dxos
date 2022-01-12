//
// Copyright 2022 DXOS.org
//

import { Modifiers, FractionUtil, ScreenBounds, Point, Scale } from '@dxos/gem-x';

import { ElementType, Rect } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { BaseElement } from '../base';
import { dragMove } from '../drag';
import { createFrame } from '../frame';

/**
 * Renderer.
 * @param scale
 */
const createRect = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: BaseElement<Rect>) => {
    const data = base.data;
    const { x, y, width, height } = scale.model.toBounds(data.bounds);

    // eslint-disable indent
    return group.selectAll('rect')
      .data(['_main_'])
      .join('rect')
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
              const { x: dx, y: dy } = scale.screen.toVertex(delta);
              const { bounds: { x, y, width, height }, ...rest } = data;
              const moved = {
                x: FractionUtil.add(x, dx),
                y: FractionUtil.add(y, dy),
                width,
                height
              };

              base.onSelect(true);
              base.onUpdate({
                ...rest,
                bounds: commit ? scale.model.snapBounds(moved) : moved
              });
            }));
        }
      })
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);
    // eslint-enable indent
  };
};

/**
 * Check not too small.
 * @param data
 * @param commit
 */
const valid = (data: Rect, commit: boolean) => {
  if (commit) {
    const { bounds: { width, height } } = data;
    if (FractionUtil.isZero(width) || FractionUtil.isZero(height)) {
      return;
    }
  }

  return data;
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/rect
 */
export class RectElement extends BaseElement<Rect> {
  _frame = createFrame();
  _main = createRect(this.scale);

  type = 'rect' as ElementType;

  // TODO(burdon): Drag should first snap (screen), then find nearest fraction here.
  createData (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): Rect {
    if (commit) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    return valid({
      bounds: this.scale.screen.toBounds(bounds)
    }, commit);
  }

  createBounds (): ScreenBounds {
    const { bounds } = this.data;
    return this.scale.model.toBounds(bounds);
  }

  // TODO(burdon): Generic.
  draw (): D3Callable {
    return group => {
      group.call(this._main, group.datum());
      group.call(this._frame, group.datum(), this.selected, this.selected && this.resizable);
    };
  }
}
