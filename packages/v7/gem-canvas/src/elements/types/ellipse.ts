//
// Copyright 2022 DXOS.org
//

import { Modifiers, FractionUtil, ScreenBounds, Point, Scale, Screen, Vertex } from '@dxos/gem-x';

import { ElementType, Ellipse } from '../../model';
import { D3Callable, D3Selection } from '../../types';
import { Control } from '../control';
import { dragMove } from '../drag';
import { createConectionPoints, createFrame } from '../frame';
import { crateText } from './text';

/**
 * Renderer.
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Element/ellipse
 * @param scale
 */
const createEllipse = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<Ellipse>) => {
    const data = control.data;
    const { center, text } = data;
    const [cx, cy] = scale.model.toPoint(center);
    const [rx, ry] = scale.model.toValues([data.rx, data.ry]);

    // eslint-disable indent
    group
      .selectAll('ellipse')
      .data(['_main_'])
      .join(enter => {
        return enter
          .append('ellipse')
          .call(selection => {
            // Drag.
            if (control.onUpdate) {
              selection
                .call(dragMove((delta: Point, mod: Modifiers, commit?: boolean) => {
                  // TODO(burdon): Snap to edge unless mod (center).
                  const { x: dx, y: dy } = scale.screen.toVertex(delta);
                  const { center, ...rest } = control.element.data;
                  const moved = {
                    x: FractionUtil.add(center.x, dx),
                    y: FractionUtil.add(center.y, dy)
                  };

                  control.onSelect(true);
                  control.onUpdate({
                    center: commit ? scale.model.snapVertex(moved) : moved,
                    ...rest
                  }, commit);
                }).filter(() => control.draggable));
            }
          })
      })
      .attr('cursor', control.draggable ? 'move' : undefined)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('rx', rx)
      .attr('ry', ry)

    group
      .call(crateText({ cx, cy, text }));
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
 * Ellipse control.
 */
export class EllipseControl extends Control<Ellipse> {
  _frame = createFrame(this.scale);
  _connectors = createConectionPoints(this.scale);
  _main = createEllipse(this.scale);

  type = 'ellipse' as ElementType;

  override drawable: D3Callable = group => {
    group.call(this._main, group.datum());
    group.call(this._connectors, group.datum(), !this.selected && this.hover);
    group.call(this._frame, group.datum(), this.selected, this.selected && this.resizable);
  };

  override getBounds (): ScreenBounds {
    const { center: { x, y }, rx, ry } = this.data;
    return this.scale.model.toBounds({
      x: FractionUtil.subtract(x, rx),
      y: FractionUtil.subtract(y, ry),
      width: FractionUtil.multiply(rx, [2, 1]),
      height: FractionUtil.multiply(ry, [2, 1])
    });
  }

  override createFromBounds (bounds: ScreenBounds, mod?: Modifiers, commit?: boolean): Ellipse {
    if (commit) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    const center = this.scale.screen.toVertex(Screen.center(bounds));
    const { width, height } = this.scale.screen.toBounds(bounds);

    return valid({
      ...this.data,
      center,
      rx: FractionUtil.divide(width, [2, 1]),
      ry: FractionUtil.divide(height, [2, 1])
    }, commit);
  }

  getConnectionPoint (handle?: string): Vertex {
    return this.data.center;
  }
}
