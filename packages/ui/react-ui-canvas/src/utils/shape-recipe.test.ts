//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  SHAPE_RECIPES,
  type ShapeRecipe,
  dragShapeNodeParam,
  dragShapeParam,
  shapeHandles,
  shapeNodeHandles,
  shapeNodeOutline,
  shapeNodePath,
  shapeOutline,
  shapeRecipe,
  shapeValues,
} from './shape-recipe.ts';

const recipe = (id: string): ShapeRecipe => {
  const found = shapeRecipe(id);
  if (!found) {
    throw new Error(`No recipe ${id}.`);
  }
  return found;
};

describe('shape recipes', () => {
  test("an arrow's head keeps its shape when the arrow is widened, and scales with its height", ({ expect }) => {
    const arrow = recipe('arrow');
    const head = (width: number, height: number) => shapeValues(arrow, { width, height }, undefined).head;
    // Widening lengthens the shaft alone.
    expect(head(200, 100)).toBe(50);
    expect(head(800, 100)).toBe(50);
    // The head is as tall as the frame, so its length follows the height: one aspect ratio at any size.
    expect(head(200, 200) / 200).toBe(head(200, 100) / 100);
  });

  test('an arrow is a shaft, then a head as tall as the frame with its tip half way down the right edge', ({
    expect,
  }) => {
    const outline = shapeOutline(recipe('arrow'), { width: 200, height: 100 }, { head: 0.5, shaft: 0.6 });
    expect(outline).toEqual([
      { x: 0, y: 20 },
      { x: 150, y: 20 },
      { x: 150, y: 0 },
      { x: 200, y: 50 },
      { x: 150, y: 100 },
      { x: 150, y: 80 },
      { x: 0, y: 80 },
    ]);
  });

  test("an arrow's two handles are at the head's back corner and where the shaft meets it", ({ expect }) => {
    expect(shapeHandles(recipe('arrow'), { width: 200, height: 100 }, { head: 0.5, shaft: 0.6 })).toEqual([
      { param: 'head', at: { x: 150, y: 0 } },
      { param: 'shaft', at: { x: 150, y: 20 } },
    ]);
  });

  test('dragging a handle sets its parameter in its own unit, within its range, and leaves the others', ({
    expect,
  }) => {
    const arrow = recipe('arrow');
    const size = { width: 200, height: 100 };
    // The head's handle, dragged 30 px to the left: the head is 80 px long, 0.8 of the height.
    expect(dragShapeParam(arrow, size, { head: 0.5, shaft: 0.6 }, 'head', { x: 120, y: 0 })).toEqual({
      head: 0.8,
      shaft: 0.6,
    });
    // The shaft's, dragged to 10 px from the top: the shaft is 80 px thick.
    expect(dragShapeParam(arrow, size, undefined, 'shaft', { x: 150, y: 10 })).toEqual({ shaft: 0.8 });
    // Past the middle the shaft would have no thickness: it stops at its least.
    expect(dragShapeParam(arrow, size, undefined, 'shaft', { x: 150, y: 90 })).toEqual({ shaft: 0.05 });
    // A parameter the recipe does not have changes nothing.
    expect(dragShapeParam(arrow, size, { head: 0.5 }, 'tail', { x: 0, y: 0 })).toEqual({ head: 0.5 });
  });

  test('a part the frame has no room for is drawn as large as fits, whatever is stored', ({ expect }) => {
    // A head four heights long in a frame one height wide: the head is the whole arrow.
    const outline = shapeOutline(recipe('arrow'), { width: 100, height: 100 }, { head: 4 });
    expect(outline[1].x).toBe(0);
    // A stored value outside its range, or not a number, is read inside it.
    expect(shapeValues(recipe('arrow'), { width: 400, height: 100 }, { shaft: 9, head: Number.NaN })).toEqual({
      head: 50,
      shaft: 100,
    });
  });

  test("a callout's tail is a size in px, so a larger callout keeps the tail it had", ({ expect }) => {
    const callout = recipe('callout');
    const tail = (width: number, height: number) => shapeValues(callout, { width, height }, undefined).tail;
    expect(tail(200, 100)).toBe(24);
    expect(tail(800, 600)).toBe(24);
  });

  test("a cross's arms are one thickness in a frame of any shape", ({ expect }) => {
    const outline = shapeOutline(recipe('cross'), { width: 300, height: 100 }, { arm: 0.4 });
    // The upright arm's width and the level arm's height.
    expect(outline[1].x - outline[0].x).toBeCloseTo(40);
    expect(outline[4].y - outline[3].y).toBeCloseTo(40);
  });

  test('a star has as many points as it is given, a whole number, its outer points on the frame', ({ expect }) => {
    const star = recipe('star');
    expect(shapeOutline(star, { width: 100, height: 100 }, undefined)).toHaveLength(10);
    expect(shapeOutline(star, { width: 100, height: 100 }, { points: 7.4 })).toHaveLength(14);
    const [top] = shapeOutline(star, { width: 200, height: 100 }, undefined);
    expect(top.x).toBeCloseTo(100);
    expect(top.y).toBeCloseTo(0);
  });

  test('a cog has four corners a tooth, its tips on the frame and a tip centred at the top', ({ expect }) => {
    const cog = recipe('cog');
    const size = { width: 200, height: 200 };
    const outline = shapeOutline(cog, size, { teeth: 6, depth: 0.1 });
    expect(outline).toHaveLength(24);
    const reach = ({ x, y }: { x: number; y: number }) => Math.hypot(x - 100, y - 100);
    // Each tooth: a foot 20 px in, two tip corners on the rim, a foot.
    expect(outline.slice(0, 4).map((point) => Math.round(reach(point)))).toEqual([80, 100, 100, 80]);
    // The first tooth's tip corners are either side of the top, level with each other.
    expect(outline[1].x + outline[2].x).toBeCloseTo(200);
    expect(outline[1].y).toBeCloseTo(outline[2].y);
    expect(outline[1].y).toBeLessThan(20);
  });

  test('every recipe draws inside its frame, with each handle on a vertex of the outline', ({ expect }) => {
    for (const size of [
      { width: 192, height: 96 },
      { width: 96, height: 192 },
      { width: 12, height: 12 },
    ]) {
      for (const known of SHAPE_RECIPES) {
        const outline = shapeOutline(known, size, undefined);
        expect(outline.length).toBeGreaterThanOrEqual(3);
        for (const { x, y } of outline) {
          expect(x).toBeGreaterThanOrEqual(-1e-9);
          expect(x).toBeLessThanOrEqual(size.width + 1e-9);
          expect(y).toBeGreaterThanOrEqual(-1e-9);
          expect(y).toBeLessThanOrEqual(size.height + 1e-9);
        }
        for (const { at } of shapeHandles(known, size, undefined)) {
          expect(outline.some(({ x, y }) => Math.hypot(x - at.x, y - at.y) < 1e-6)).toBe(true);
        }
      }
    }
  });

  test('a recipe fitted to a tall or a flat frame keeps an area to fill', ({ expect }) => {
    const area = (points: readonly { x: number; y: number }[]) =>
      Math.abs(
        points.reduce((sum, { x, y }, index) => {
          const next = points[(index + 1) % points.length];
          return sum + x * next.y - next.x * y;
        }, 0),
      ) / 2;
    for (const size of [
      { width: 48, height: 192 },
      { width: 192, height: 12 },
    ]) {
      for (const known of SHAPE_RECIPES) {
        expect(area(shapeOutline(known, size, undefined)), known.id).toBeGreaterThan(size.width * size.height * 0.05);
      }
    }
    // A parallelogram's slant stops at half the width, so a body is left between its two slanted sides.
    expect(shapeValues(recipe('parallelogram'), { width: 48, height: 192 }, undefined).slant).toBe(24);
  });

  test('a handle dragged to where it is leaves its parameter as it was', ({ expect }) => {
    const size = { width: 192, height: 96 };
    for (const known of SHAPE_RECIPES) {
      const before = shapeValues(known, size, undefined);
      for (const { param, at } of shapeHandles(known, size, undefined)) {
        const after = shapeValues(known, size, dragShapeParam(known, size, undefined, param, at));
        expect(after[param]).toBeCloseTo(before[param], 1);
      }
    }
  });

  test('every recipe has an id of its own, a name and an icon', ({ expect }) => {
    expect(new Set(SHAPE_RECIPES.map(({ id }) => id)).size).toBe(SHAPE_RECIPES.length);
    expect(SHAPE_RECIPES.every(({ name, icon }) => name.length > 0 && /^(ph|px)--[a-z-]+--regular$/.test(icon))).toBe(
      true,
    );
  });

  test("a placed shape's handles are in scene coordinates, turned as the shape is, and a drag is read back the same way", ({
    expect,
  }) => {
    const node = {
      recipe: 'arrow',
      center: { x: 500, y: 300 },
      size: { width: 200, height: 100 },
      params: { head: 0.5, shaft: 0.6 },
    };
    // Unturned: the frame's top-left is (400, 250), and the head's back corner 150 px along its top edge.
    expect(shapeNodeHandles(node)[0]).toEqual({ param: 'head', at: { x: 550, y: 250 } });
    // A quarter turn clockwise about the centre puts that corner on the right edge, below the middle.
    const [head] = shapeNodeHandles({ ...node, rotation: 90 });
    expect(head.at.x).toBeCloseTo(550);
    expect(head.at.y).toBeCloseTo(350);
    // Dragged 30 px back along the turned arrow, the head is 80 px long, as on the unturned one.
    expect(dragShapeNodeParam({ ...node, rotation: 90 }, 'head', { x: 550, y: 320 }).head).toBeCloseTo(0.8);
    expect(dragShapeNodeParam(node, 'head', { x: 520, y: 250 })).toEqual({ head: 0.8, shaft: 0.6 });
    // A recipe this build does not have has no handles, and a drag leaves its parameters.
    expect(shapeNodeHandles({ ...node, recipe: 'unknown' })).toEqual([]);
    expect(dragShapeNodeParam({ ...node, recipe: 'unknown' }, 'head', { x: 0, y: 0 })).toEqual(node.params);
  });

  test('a shape whose recipe this build does not have is drawn as its frame', ({ expect }) => {
    const size = { width: 120, height: 60 };
    expect(shapeNodeOutline({ recipe: 'from-a-newer-build', size })).toEqual([
      { x: 0, y: 0 },
      { x: 120, y: 0 },
      { x: 120, y: 60 },
      { x: 0, y: 60 },
    ]);
    expect(shapeNodePath({ recipe: 'arrow', size: { width: 0, height: 60 } })).toBe('');
    expect(shapeNodePath({ recipe: 'arrow', size })).toMatch(/^M /);
  });
});
