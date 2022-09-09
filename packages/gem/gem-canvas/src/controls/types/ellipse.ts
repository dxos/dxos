//
// Copyright 2022 DXOS.org
//

import { D3Callable, D3Selection, Modifiers, FractionUtil, ScreenBounds, Point, Scale, Screen, Vertex } from '@dxos/gem-core';

import { ElementType, Ellipse } from '../../model';
import { Control } from '../control';
import { dragMove } from '../drag';
import { createConectionHandles, createFrame, getConectionHandle } from '../frame';
import { createText } from './text';

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
    const bounds = control.getBounds();

    // eslint-disable indent
    group
      .selectAll('ellipse')
      .data(['main'])
      .join(enter => {
        return enter
          .append('ellipse')
          .call(selection => {
            // Drag.
            if (control.editable) {
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
                  control.onUpdate({ center: commit ? scale.model.snapVertex(moved) : moved, ...rest }, commit);
                }).filter(event => control.draggable && !event.ctrlKey && !event.button));
            }
          });
      })
      .style('cursor', control.editable && control.draggable ? 'move' : undefined)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('rx', rx)
      .attr('ry', ry);

    // TODO(burdon): Factor out.
    group
      .call(createText({
        editable: control.editing,
        bounds,
        text: control.debug ? control?.element?.id.substring(0, 4) : text,
        onUpdate: (value: string) => {
          control.onUpdate({ ...control.data, text: value }, true);
          control.onEdit(false);
        },
        onCancel: () => control.onEdit(false)
      }));
    // eslint-enable indent
  };
};

/**
 * Ellipse control.
 */
export class EllipseControl extends Control<Ellipse> {
  _frame = createFrame(this.scale);
  _connectors = createConectionHandles(this.scale);
  _main = createEllipse(this.scale);

  type = 'ellipse' as ElementType;

  override drawable: D3Callable = group => {
    const control = group.datum(); // TODO(burdon): Pattern.
    group.call(this._main, group.datum());
    group.call(this._frame, group.datum(), this.selected, this.resizable);
    group.call(this._connectors, control, this.connections);
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

  override checkBounds (data: Ellipse) {
    const { rx, ry } = data;
    return (FractionUtil.toNumber(rx) >= 1 && FractionUtil.toNumber(ry) >= 1);
  }

  override createFromBounds (bounds: ScreenBounds, mod?: Modifiers, snap?: boolean): Ellipse {
    if (snap) {
      bounds = this.scale.screen.snapBounds(bounds);
    }

    const center = this.scale.screen.toVertex(Screen.center(bounds));
    const { width, height } = this.scale.screen.toBounds(bounds);

    return {
      ...this.data,
      center,
      rx: FractionUtil.divide(width, [2, 1]),
      ry: FractionUtil.divide(height, [2, 1])
    };
  }

  override getConnectionPoint (handle?: string): Vertex {
    const { center, rx, ry } = this.data;
    if (!handle) {
      return center;
    }

    const { p } = getConectionHandle(handle);
    return {
      x: FractionUtil.add(center.x, FractionUtil.multiply(FractionUtil.toFraction(p[0]), rx)),
      y: FractionUtil.add(center.y, FractionUtil.multiply(FractionUtil.toFraction(p[1]), ry))
    };
  }
}
