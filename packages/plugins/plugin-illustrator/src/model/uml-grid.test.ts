//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene.ts';
import { CLASS_DIAGRAM } from './testing.ts';
import { GRID, type Router, compile } from './uml-grid.ts';

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const nodesOf = (objects: Scene.WorldObject[]) => objects.filter((object) => object.id !== 'edges');

const frameOf = (node: Scene.WorldObject) => node.elements.find((element) => element.id === 'frame') as Scene.Box;

describe('uml-grid', () => {
  test('every class renders as an equal-size frame with a top-rounded header', ({ expect }) => {
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM)));

    expect(nodes).toHaveLength(6);
    const sizes = new Set(
      nodes.map((node) => {
        const [frame, title] = node.elements as Scene.Box[];
        expect(frame.id).toBe('frame');
        expect(title.id).toBe('title');
        expect(title.corners).toBe('top');
        expect(title.w).toBe(frame.w);
        // Members render as free text inside the frame, not a third bordered rect.
        const body = node.elements.find((element) => element.id === 'body');
        if (body) {
          expect(body.kind).toBe('text');
        }
        return `${frame.w}x${frame.h}`;
      }),
    );
    expect(sizes.size).toBe(1);
  });

  test('cells and positions align to the grid', ({ expect }) => {
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM)));

    for (const node of nodes) {
      expect(node.origin!.x % GRID).toBe(0);
      expect(node.origin!.y % GRID).toBe(0);
      const frame = frameOf(node);
      expect(frame.w % GRID).toBe(0);
      expect(frame.h % GRID).toBe(0);
    }
  });

  test('connectors are orthogonal: every segment is axis-aligned', ({ expect }) => {
    const edges = objectsOf(compile(CLASS_DIAGRAM)).find((object) => object.id === 'edges')!;

    const segments: [Scene.Point, Scene.Point][] = [];
    for (const element of edges.elements) {
      if (element.kind === 'line') {
        element.points.forEach((point, index) => {
          if (index > 0) {
            segments.push([element.points[index - 1], point]);
          }
        });
      } else if (element.kind === 'arrow') {
        segments.push([element.start!, element.end!]);
      }
    }

    expect(segments.length).toBeGreaterThan(0);
    for (const [head, tail] of segments) {
      expect(head.x === tail.x || head.y === tail.y).toBe(true);
    }
  });

  test('arrowheads terminate on the target cell edge and labels float alongside', ({ expect }) => {
    const objects = objectsOf(compile(CLASS_DIAGRAM));
    const edges = objects.find((object) => object.id === 'edges')!;
    const animal = objects.find((object) => object.id === 'Animal')!;
    const frame = frameOf(animal);

    // `Animal <|-- Dog` renders upward: the head lands on Animal's bottom edge.
    const inheritance = edges.elements.find(
      (element): element is Scene.Arrow => element.kind === 'arrow' && element.id.startsWith('Dog-Animal'),
    )!;
    expect(inheritance.end!.y).toBe(animal.origin!.y + frame.h);

    const labels = edges.elements.filter((element) => element.kind === 'text');
    expect(labels.map((element) => (element as Scene.Text).text)).toEqual(
      expect.arrayContaining(['1 owns *', 'chews']),
    );
  });

  test('dashed styling carries onto routed paths', ({ expect }) => {
    const edges = objectsOf(compile(CLASS_DIAGRAM)).find((object) => object.id === 'edges')!;
    const realization = edges.elements.find(
      (element): element is Scene.Arrow => element.kind === 'arrow' && element.id.startsWith('Dog-Serializable'),
    )!;
    expect(realization.stroke).toBe('dashed');
  });

  test('a custom router controls the path', ({ expect }) => {
    const route: Router = ({ from, to }) => [
      { x: from.x, y: from.y },
      { x: from.x, y: -100 },
      { x: to.x, y: -100 },
      { x: to.x, y: to.y },
    ];
    const edges = objectsOf(compile(CLASS_DIAGRAM, { route })).find((object) => object.id === 'edges')!;
    const paths = edges.elements.filter((element): element is Scene.Polyline => element.kind === 'line');

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.points.some((point) => point.y === -100)).toBe(true);
    }
  });

  test('default height clamps to the GRID-derived bounds', ({ expect }) => {
    const members = Array.from({ length: 30 }, (_, index) => `  +field${index}: string`);
    const source = ['classDiagram', 'class Big {', ...members, '}'].join('\n');
    const [big] = nodesOf(objectsOf(compile(source)));

    const frame = frameOf(big);
    // Far shorter than the unclamped member stack, whatever the tuned MAX_H is.
    expect(frame.h).toBeLessThan(30 * 26);
    expect(frame.h % GRID).toBe(0);
  });

  test('cell and titleHeight options fix the node size', ({ expect }) => {
    const snap = (value: number) => Math.ceil(value / GRID) * GRID;
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM, { cell: { w: 256, h: 480 }, titleHeight: 48 })));

    for (const node of nodes) {
      const [frame, title] = node.elements as Scene.Box[];
      expect(frame.w).toBe(snap(256));
      expect(frame.h).toBe(snap(480));
      expect(title.h).toBe(48);
    }
  });

  test('aligned columns straighten connectors', ({ expect }) => {
    const source = ['classDiagram', 'class A', 'class B', 'A <|-- B'].join('\n');
    const objects = objectsOf(compile(source));
    const edges = objects.find((object) => object.id === 'edges')!;

    // The sole subtype sits directly below its supertype, so the arrow runs straight: a single
    // two-point segment, no polyline waypoints.
    expect(edges.elements.filter((element) => element.kind === 'line')).toHaveLength(0);
    const [arrow] = edges.elements as Scene.Arrow[];
    expect(arrow.start!.x).toBe(arrow.end!.x);
    const [a, b] = ['A', 'B'].map((id) => objects.find((object) => object.id === id)!);
    expect(a.origin!.x).toBe(b.origin!.x);
  });

  test('parallel relations between the same lanes take separate channels', ({ expect }) => {
    const source = [
      'classDiagram',
      'class A',
      'class B',
      'class C',
      'class D',
      'A --> C',
      'A --> D',
      'B --> C',
      'B --> D',
    ].join('\n');
    const edges = objectsOf(compile(source)).find((object) => object.id === 'edges')!;
    const paths = edges.elements.filter((element): element is Scene.Polyline => element.kind === 'line');

    // Column alignment can straighten at most one of the crossing edges; the rest bend through
    // the same gutter and their channel runs must not share a coordinate.
    expect(paths.length).toBeGreaterThanOrEqual(2);
    const channels = paths.map((path) => path.points[1].y);
    expect(new Set(channels).size).toBe(paths.length);
  });
});
