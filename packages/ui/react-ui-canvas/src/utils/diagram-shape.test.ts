//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SvgFile } from '@dxos/diagram';
import { type DiagramNode, type Link, type Point } from '@dxos/scene';

import { diagramLinkElements, diagramNodeMarkup, diagramRoute } from './diagram-shape.ts';

const source = { x: 0, y: 0, width: 192, height: 96 };
const target = { x: 384, y: 224, width: 192, height: 96 };

/** Whether a point is on a frame's outline. */
const onOutline = ({ x, y, width, height }: typeof source, point: Point) =>
  ((point.x === x || point.x === x + width) && point.y >= y && point.y <= y + height) ||
  ((point.y === y || point.y === y + height) && point.x >= x && point.x <= x + width);

/** Whether every run of a route is horizontal or vertical. */
const orthogonal = (points: readonly Point[]) =>
  points.slice(1).every((point, index) => point.x === points[index].x || point.y === points[index].y);

describe('diagramRoute', () => {
  const route = [
    { x: 96, y: 96 },
    { x: 96, y: 272 },
    { x: 384, y: 272 },
  ];

  test('keeps the layout route while its ends meet the frames', ({ expect }) => {
    expect(diagramRoute({ route }, source, target)).toEqual({ points: route, laid: true });
  });

  test('re-routes orthogonally once a frame has moved off the route', ({ expect }) => {
    const moved = { ...target, y: 448 };
    const { points, laid } = diagramRoute({ route }, source, moved);
    expect(laid).toBe(false);
    expect(orthogonal(points)).toBe(true);
    expect(onOutline(source, points[0]) && onOutline(moved, points[points.length - 1])).toBe(true);
  });

  test('a re-route keeps clear of the boxes in its way', ({ expect }) => {
    const moved = { ...target, x: 0, y: 448 };
    const between = { x: 0, y: 224, width: 192, height: 96 };
    const { points } = diagramRoute({ route }, source, moved, [between]);
    const crosses = points.slice(1).some((end, index) => {
      const start = points[index];
      const [x0, x1] = [Math.min(start.x, end.x), Math.max(start.x, end.x)];
      const [y0, y1] = [Math.min(start.y, end.y), Math.max(start.y, end.y)];
      return x1 > between.x && x0 < between.x + between.width && y1 > between.y && y0 < between.y + between.height;
    });
    expect(orthogonal(points)).toBe(true);
    expect(crosses).toBe(false);
  });

  test('a connector the layout never routed runs straight between the borders', ({ expect }) => {
    const { points, laid } = diagramRoute({}, source, { ...target, y: 0 });
    expect(laid).toBe(false);
    expect(points).toEqual([
      { x: 192, y: 48 },
      { x: 384, y: 48 },
    ]);
  });
});

describe('diagram markup', () => {
  test('a diagram node draws what the SVG file draws for its element', ({ expect }) => {
    const node: DiagramNode = {
      type: 'diagram',
      id: 'box',
      z: 'a',
      center: { x: 96, y: 48 },
      size: { width: 192, height: 96 },
      label: 'API server',
      element: { kind: 'rect', id: 'box', x: 0, y: 0, w: 10, h: 10, text: 'stale' },
    };
    const file = SvgFile.toSvgFile([
      { id: 'box', elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 192, h: 96, text: 'API server' }] },
    ]);
    const markup = diagramNodeMarkup(node).map(SvgFile.serialize);
    expect(markup).toHaveLength(1);
    expect(file).toContain(markup[0]);
  });

  test('a re-routed connector keeps its caption, beside its longest run', ({ expect }) => {
    const link: Link = { type: 'line', id: 'a-b', z: 'a', source: { node: 'a' }, target: { node: 'b' }, text: 'calls' };
    const elements = diagramLinkElements(
      link,
      { caption: { x: 0, y: 0 } },
      {
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 40 },
          { x: 300, y: 40 },
        ],
        laid: false,
      },
    );
    expect(elements.map((element) => [element.kind, element.id])).toEqual([
      ['line', 'a-b-path'],
      ['arrow', 'a-b'],
      ['text', 'a-b-label'],
    ]);
    const caption = elements[2];
    expect(caption.kind === 'text' && caption.y < 40 && caption.x > 0 && caption.x < 150).toBe(true);
  });
});
