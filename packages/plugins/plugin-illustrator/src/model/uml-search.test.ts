//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import type * as Scene from './scene';
import { parse } from './uml';
import { measureCell } from './uml-grid';
import { buildGroups, inheritanceTreeRule, linearChainRule, packGroups, resolveRects } from './uml-rules';
import { compile, scoreLayout, searchPlacement } from './uml-search';

/** The reference shape: a chain A→B→C→D plus a hierarchy Z <|- X, Z <|- Y linked into it. */
const SOURCE = trim`
  classDiagram
      class A
      class B
      class C
      class D
      class X
      class Y
      class Z

      A ..> B
      B ..> C
      C ..> D
      Z <|-- X
      Z <|-- Y
      X ..> B
`;

describe('uml-search', () => {
  test('score rewards straight lines and punishes crossings', ({ expect }) => {
    const model = parse(['classDiagram', 'class A', 'class B', 'A ..> B'].join('\n'));
    const straight = new Map([
      ['A', { x: 0, y: 200, w: 100, h: 50 }],
      ['B', { x: 0, y: 0, w: 100, h: 50 }],
    ]);
    const jogged = new Map([
      ['A', { x: 300, y: 200, w: 100, h: 50 }],
      ['B', { x: 0, y: 0, w: 100, h: 50 }],
    ]);
    expect(scoreLayout(model, straight)).toBe(1);
    expect(scoreLayout(model, jogged)).toBe(0);

    // Two edges forced across each other score −2 relative to two straight columns.
    const crossing = parse(
      ['classDiagram', 'class A', 'class B', 'class C', 'class D', 'A ..> B', 'C ..> D'].join('\n'),
    );
    const crossed = new Map([
      ['A', { x: 0, y: 200, w: 100, h: 50 }],
      ['B', { x: 300, y: 0, w: 100, h: 50 }],
      ['C', { x: 300, y: 200, w: 100, h: 50 }],
      ['D', { x: 0, y: 0, w: 100, h: 50 }],
    ]);
    expect(scoreLayout(crossing, crossed)).toBeLessThan(0);
  });

  test('search starts from the chain and compile keeps the higher-scoring layout', ({ expect }) => {
    const model = parse(SOURCE);
    const cell = measureCell(model, { maxWidth: 192 });
    const groups = buildGroups(model, cell, [inheritanceTreeRule, linearChainRule]);

    const searched = searchPlacement(model, groups);
    const packed = packGroups(model, groups);
    const searchedScore = scoreLayout(model, resolveRects(groups, searched));
    const packedScore = scoreLayout(model, resolveRects(groups, packed));

    // The guarantee is the SELECTION, not search superiority (the search is greedy): the compiled
    // layout scores at least as high as either candidate.
    const compiled = objectsOf(compile(SOURCE)).filter(
      (object) => !object.id.startsWith('group:') && object.id !== 'edges',
    );
    const rects = new Map(
      compiled.map((object) => {
        const frame = object.elements[0] as Scene.Box;
        return [object.id, { x: object.origin!.x, y: object.origin!.y, w: frame.w, h: frame.h }];
      }),
    );
    expect(scoreLayout(model, rects)).toBeGreaterThanOrEqual(Math.max(searchedScore, packedScore));

    // The chain group anchors the layout; the hierarchy sits axis-aligned next to it.
    const chain = groups.find((group) => group.rule === 'chain')!;
    expect([...chain.rects.keys()]).toEqual(['A', 'B', 'C', 'D']);
    expect(searched.has(chain.id)).toBe(true);
  });

  test('compiles every node and both group frames without overlap', ({ expect }) => {
    const objects = objectsOf(compile(SOURCE));
    const nodes = objects.filter((object) => !object.id.startsWith('group:') && object.id !== 'edges');
    expect(nodes.length).toBe(7);

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
