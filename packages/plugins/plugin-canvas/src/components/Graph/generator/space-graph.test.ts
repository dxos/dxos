//
// Copyright 2026 DXOS.org
//

//
// `check.mjs` from the studio draft, as a test: the ported geometry run on the golden file's inputs, every cell,
// object, link and reader pick compared with the deck's own output. It is the reason `layout()`, `pick()` and
// `toward()` must not be "improved" — the slide this copies is the golden file.
//

import { describe, test } from 'vitest';

import { golden } from './golden.ts';
import { layout, pick, toward } from './space-graph.generator.ts';

const round = (value: number) => Math.round(value * 1000) / 1000;
const pairs = (list: readonly { x: number; y: number }[]) => list.map((point) => [round(point.x), round(point.y)]);

describe('space-graph geometry against the deck', () => {
  const center = { x: golden.center[0], y: golden.center[1] };
  const result = layout(center, golden.r, golden.params);

  test('every lattice cell and object is where the deck put it', ({ expect }) => {
    expect(result.cells).toHaveLength(golden.cells.length);
    expect(pairs(result.cells)).toEqual(golden.cells);
    expect(pairs(result.nodes)).toEqual(golden.nodes);
    expect(result.nodeR).toEqual(golden.nodeR);
  });

  test("the graph has the deck's links", ({ expect }) => {
    expect(result.links).toEqual(golden.links);
  });

  test.for(golden.readers.map((reader, index) => [reader, index] as const))(
    'reader %# reaches the objects the deck lit',
    ([reader, index], { expect }) => {
      const from = { x: reader.from[0], y: reader.from[1] };
      const aim = toward(center, golden.r, from, index);
      expect([round(aim.x), round(aim.y)]).toEqual(reader.toward);
      expect(pick(result.nodes, golden.params.picks ?? 2, aim)).toEqual(reader.picks);
    },
  );
});
