//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Scene from './scene';
import { CLASS_DIAGRAM } from './testing';
import { GRID, type Router, compile } from './uml-grid';

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const nodesOf = (objects: Scene.WorldObject[]) => objects.filter((object) => object.id !== 'edges');

describe('uml-grid', () => {
  test('every class renders as an equal-size title/body cell', ({ expect }) => {
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM)));

    expect(nodes).toHaveLength(6);
    const sizes = new Set(
      nodes.map((node) => {
        expect(node.elements.map((element) => element.id)).toEqual(['title', 'body']);
        const [title, body] = node.elements as Scene.Box[];
        expect(body.y).toBe(title.h);
        return `${title.w}x${title.h + body.h}`;
      }),
    );
    expect(sizes.size).toBe(1);
  });

  test('cells and positions align to the grid', ({ expect }) => {
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM)));

    for (const node of nodes) {
      expect(node.origin!.x % GRID).toBe(0);
      expect(node.origin!.y % GRID).toBe(0);
      for (const element of node.elements as Scene.Box[]) {
        expect(element.w % GRID).toBe(0);
        expect(element.h % GRID).toBe(0);
      }
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
    const [title, body] = animal.elements as Scene.Box[];

    // `Animal <|-- Dog` renders upward: the head lands on Animal's bottom edge.
    const inheritance = edges.elements.find(
      (element): element is Scene.Arrow => element.kind === 'arrow' && element.id.startsWith('Dog-Animal'),
    )!;
    expect(inheritance.end!.y).toBe(animal.origin!.y + title.h + body.h);

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

    const [title, body] = big.elements as Scene.Box[];
    // Far shorter than the unclamped member stack, whatever the tuned MAX_H is.
    expect(title.h + body.h).toBeLessThan(30 * 26);
    expect((title.h + body.h) % GRID).toBe(0);
  });

  test('cell option fixes the node size', ({ expect }) => {
    const snap = (value: number) => Math.ceil(value / GRID) * GRID;
    const nodes = nodesOf(objectsOf(compile(CLASS_DIAGRAM, { cell: { w: 256, h: 480 } })));

    for (const node of nodes) {
      const [title, body] = node.elements as Scene.Box[];
      expect(title.w).toBe(snap(256));
      expect(title.h + body.h).toBe(snap(480));
    }
  });

  test('parallel relations between the same lanes take separate channels', ({ expect }) => {
    const source = ['classDiagram', 'class A', 'class B', 'class C', 'class D', 'A --> D : one', 'B --> C : two'].join(
      '\n',
    );
    const edges = objectsOf(compile(source)).find((object) => object.id === 'edges')!;
    const paths = edges.elements.filter((element): element is Scene.Polyline => element.kind === 'line');

    // Both edges bend through the same gutter; their channel runs must not share a coordinate.
    expect(paths.length).toBe(2);
    const channels = paths.map((path) => path.points[1].y);
    expect(new Set(channels).size).toBe(paths.length);
  });
});
