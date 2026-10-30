//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { type LayoutIntent, Scene } from '@dxos/scene';

import { type Canvas } from '#types';

import { applyLayoutIntent } from './layout-source.ts';
import { canvasModel2D, plain } from './records.ts';

const layouts2D = (canvas: Canvas.Canvas): Scene.Layout2D[] =>
  canvas.layouts.flatMap((ref) => (Obj.instanceOf(Scene.Layout2D, ref.target) ? [ref.target] : []));

const isLink = (element: Scene.Element2D): boolean => element.source !== undefined || element.target !== undefined;

/** How many elements of the canvas's 2D layouts take each of its model's named styles, by style key. */
export const namedStyleUses = (canvas: Canvas.Canvas): Record<string, number> => {
  const uses: Record<string, number> = {};
  for (const layout of layouts2D(canvas)) {
    for (const element of Object.values(layout.elements)) {
      if (element.style !== undefined) {
        uses[element.style] = (uses[element.style] ?? 0) + 1;
      }
    }
  }
  return uses;
};

/**
 * Removes the named style `id` from the canvas's model. The elements that took it keep its look as their own overrides
 * (under anything they set themselves), so deleting a style changes how nothing looks, only what restyles together; a
 * link keeps the style's hue and line style, all it ever drew.
 */
export const deleteNamedStyle = (canvas: Canvas.Canvas, id: string): void => {
  const model = canvasModel2D(canvas);
  const { name: _name, ...look } = plain(model?.styles?.[id] ?? {});
  for (const layout of layouts2D(canvas)) {
    const intents = Object.values(layout.elements).flatMap((element): LayoutIntent[] => {
      if (element.style !== id) {
        return [];
      }
      const base = isLink(element)
        ? {
            ...(look.hue !== undefined ? { hue: look.hue } : {}),
            ...(look.lineStyle !== undefined ? { lineStyle: look.lineStyle } : {}),
          }
        : look;
      const overrides = { ...base, ...plain(element.overrides ?? {}) };
      return [
        { kind: 'update', id: element.id, path: ['style'] },
        ...(Object.keys(overrides).length > 0
          ? [{ kind: 'update', id: element.id, path: ['overrides'], value: overrides } as const]
          : []),
      ];
    });
    intents.length > 0 && applyLayoutIntent(layout, { kind: 'batch', intents });
  }
  if (model?.styles?.[id] !== undefined) {
    Obj.update(model, (model) => {
      delete model.styles?.[id];
    });
  }
};
