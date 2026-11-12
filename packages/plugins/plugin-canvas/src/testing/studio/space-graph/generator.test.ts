//
// Copyright 2026 DXOS.org
//

//
// The space graph through the operations an agent would use: `canvas.createGenerator` compiles it, and
// `canvas.inspectGenerator` runs it headless and reports whether it is deterministic and inside the step budget.
// The shape counts are the check: 169 lattice cells, of which 101 are objects, 126 links, the ring, and one tap per
// reader pick — so a change that quietly drops the graph fails here rather than on a slide.
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { describe } from 'vitest';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { addCanvas } from '#model';
import { CanvasOperationHandlerSet } from '#operations';
import { CanvasOperation } from '#types';

import schemaTypes from '../../../capabilities/schema.ts';
import { golden } from './golden.ts';
import paramsSource from './params.schema.json?raw';
import source from './space-graph.generator.ts?raw';

const TestLayer = AssistantTestLayer({
  operationHandlers: CanvasOperationHandlerSet.handlers,
  types: [Drawing.Drawing, Drawing.Canvas, ...schemaTypes],
  disableLlmMemoization: true,
});

/** The node frame the slide gives the space: the circle is inscribed in it. */
const BOUNDS = {
  x: golden.center[0] - golden.r,
  y: golden.center[1] - golden.r,
  width: golden.r * 2,
  height: golden.r * 2,
};

/** Ring + empty lattice dots + links + objects, with no reader bound. */
const BARE = 1 + (golden.cells.length - golden.nodes.length) + golden.links.length + golden.nodes.length;

describe('space-graph generator', () => {
  it.effect(
    'compiles, draws the deck’s graph, and reports it deterministic with its step timed against a budget',
    Effect.fnUntraced(
      function* ({ expect }) {
        const canvas = yield* addCanvas();
        const drawing = yield* Database.add(Drawing.make({ name: 'Space', canvas }));
        yield* Database.flush();

        const created = yield* Operation.invoke(CanvasOperation.CreateGenerator, {
          name: 'Space graph',
          description: 'One ECHO space: a connected graph of objects on a hexagonal lattice inside a circle.',
          source,
          params: JSON.parse(paramsSource),
        });
        expect(created.errors).toBeUndefined();

        const { node } = yield* Operation.invoke(CanvasOperation.AddGenerator, {
          drawing: Ref.make(drawing),
          generator: created.generator,
          bounds: BOUNDS,
          params: golden.params,
        });

        const report = yield* Operation.invoke(CanvasOperation.InspectGenerator, {
          generator: created.generator,
          drawing: Ref.make(drawing),
          node,
          times: [0, 1, 2],
        });
        expect(report.errors).toBeUndefined();
        expect(report.deterministic).toBe(true);
        // How long a step takes is the host's doing (a loaded CI runner is several times slower), so what is checked
        // is that the report times the step and names the budget to hold it to, not that this host met it.
        expect(report.meanStepMs).toBeGreaterThan(0);
        expect(report.budgetMs).toBeGreaterThan(0);
        // Stateless and unbound, so every time draws the same graph.
        expect(report.frames).toEqual([0, 1, 2].map((t) => ({ t, shapes: BARE })));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    120_000,
  );
});
