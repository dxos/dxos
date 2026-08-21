//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import type * as Scene from './scene';
import { parse } from './uml';
import { measureCell } from './uml-grid';
import { compile, inheritanceTreeRule, linearChainRule } from './uml-rules';

const SOURCE = trim`
  classDiagram
      class Node {
          <<abstract>>
          +id: string
      }
      class Container
      class Leaf
      class Registry
      class Index
      class Query
      class Store
      class Cache
      class Codec

      Node <|-- Container
      Node <|-- Leaf
      Container *-- Node : children
      Registry o-- Node
      Index ..> Registry
      Query ..> Index
      Query ..> Store
      Store *-- Cache
      Store ..> Codec
      Registry ..> Codec
      Container ..> Store
`;

describe('uml-rules', () => {
  test('inheritance rule claims the tree: root on top, peers on one horizontal axis', ({ expect }) => {
    const model = parse(SOURCE);
    const cell = measureCell(model, { maxWidth: 192 });
    const unclaimed = new Set(model.classes.map((entry) => entry.id));
    const [group] = inheritanceTreeRule.apply(model, unclaimed, cell);

    expect([...group.rects.keys()].sort()).toEqual(['Container', 'Leaf', 'Node']);
    expect(unclaimed.has('Node')).toBe(false);
    const node = group.rects.get('Node')!;
    const container = group.rects.get('Container')!;
    const leaf = group.rects.get('Leaf')!;
    expect(node.y).toBeLessThan(container.y);
    expect(container.y).toBe(leaf.y);
    expect(container.x).not.toBe(leaf.x);
  });

  test('chain rule claims the longest linear relation and renders it left to right', ({ expect }) => {
    const model = parse(SOURCE);
    const cell = measureCell(model, { maxWidth: 192 });
    const unclaimed = new Set(model.classes.map((entry) => entry.id));
    inheritanceTreeRule.apply(model, unclaimed, cell);
    const [group] = linearChainRule.apply(model, unclaimed, cell);

    // Query ..> Index ..> Registry ..> Codec is the longest chain; targets sit to the right.
    expect([...group.rects.keys()].sort()).toEqual(['Codec', 'Index', 'Query', 'Registry']);
    const x = (id: string) => group.rects.get(id)!.x;
    expect(x('Query')).toBeLessThan(x('Index'));
    expect(x('Index')).toBeLessThan(x('Registry'));
    expect(x('Registry')).toBeLessThan(x('Codec'));
    // A row: shared y.
    expect(new Set([...group.rects.values()].map((rect) => rect.y)).size).toBe(1);
  });

  test('tolerates a cyclic hierarchy without recursing forever', ({ expect }) => {
    const source = ['classDiagram', 'Root <|-- A', 'A <|-- B', 'B <|-- A'].join('\n');
    const model = parse(source);
    const cell = measureCell(model, { maxWidth: 192 });
    const unclaimed = new Set(model.classes.map((entry) => entry.id));

    const groups = inheritanceTreeRule.apply(model, unclaimed, cell);
    const claimed = new Set(groups.flatMap((group) => [...group.rects.keys()]));
    expect(claimed.has('Root')).toBe(true);
    // Every node renders at most once.
    for (const group of groups) {
      expect(group.rects.size).toBe(new Set(group.rects.keys()).size);
    }
  });

  test('compiles all nodes with non-overlapping group frames', ({ expect }) => {
    const objects = objectsOf(compile(SOURCE));
    const nodes = objects.filter((object) => !object.id.startsWith('group:') && object.id !== 'edges');
    expect(nodes.length).toBe(9);

    const frames = objects.filter((object) => object.id.startsWith('group:'));
    expect(frames.length).toBe(2);
    const bounds = frames.map((frame) => {
      const rect = frame.elements[0] as Scene.Box;
      return { x: frame.origin!.x, y: frame.origin!.y, w: rect.w, h: rect.h };
    });
    const [a, b] = bounds;
    const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    expect(overlap).toBe(false);
  });
});

const objectsOf = (commands: Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));
