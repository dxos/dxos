//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Database, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { Diagnostics, SVG_SCHEMA, SvgBuilder } from '@dxos/plugin-illustrator/model';
import { UmlSkill } from '@dxos/plugin-illustrator/skills';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

//
// Tier 3 of the illustrator eval (see plugin-illustrator/docs/DESIGN.md): the agent is asked to
// diagram a small system it is told about, and the result is graded by the same `Diagnostics`
// report that gates our own layouts — plus deterministic checks that the diagram is about the
// system it was given. No LLM judge yet: legibility and grounding are both machine-checkable.
//

const SYSTEM = trim`
  Components of the "Relay" service (each with its documentation URL):
  - Gateway (https://example.com/docs/gateway) — accepts client HTTPS requests.
  - Auth (https://example.com/docs/auth) — verifies tokens for the Gateway.
  - Router (https://example.com/docs/router) — the Gateway forwards authenticated requests here.
  - Store (https://example.com/docs/store) — the Router reads and writes records here.
  - Indexer (https://example.com/docs/indexer) — watches the Store for changes.
  - Notifier (https://example.com/docs/notifier) — the Indexer tells it about changed records; it pushes to clients.
  Gateway and Auth form the "Edge" group; Router, Store, Indexer and Notifier form the "Core" group.
`;

const EXPECTED_NODES = ['Gateway', 'Auth', 'Router', 'Store', 'Indexer', 'Notifier'];

/**
 * The drawing the run was asked for, analysed by the same `Diagnostics` report that gates our own
 * layouts. One effect, shared by every scorer below: the analysis is paid for once per run.
 */
const relayDrawing = Scorer.shared(
  Effect.gen(function* () {
    const drawing = yield* findObject(Drawing.Drawing, (entry) => entry.name === 'Relay');
    if (!drawing) {
      return undefined;
    }
    const canvas = yield* Database.load(drawing.canvas);
    const { scene } = SvgBuilder.read(canvas);
    const report = Diagnostics.analyze(scene.objects);
    return {
      errors: Diagnostics.errors(report).map(({ message }) => message),
      metrics: report.metrics,
      nodes: scene.objects.filter((object) => object.id !== 'edges').map(({ id, ref }) => ({ id, ref })),
    };
  }),
);

/** Reads the drawing and turns it into a mark. */
const drawn = (score: (drawing: Effect.Success<typeof relayDrawing>) => Scorer.Result) =>
  relayDrawing.pipe(Effect.map(score));

const SCORERS = [
  Scorer.make({
    name: 'drawing-generated',
    description: 'A drawing named "Relay" exists and holds at least one node.',
    score: drawn((drawing) => (drawing?.nodes.length ?? 0) > 0),
  }),
  Scorer.make({
    name: 'no-hard-defects',
    description: 'Diagnostics report no errors (overlap, route through node, label overflow).',
    score: drawn((drawing) => !!drawing && drawing.errors.length === 0),
  }),
  Scorer.make({
    name: 'components-present',
    description: 'Every described component appears as a node (fraction present).',
    score: drawn((drawing) => {
      const ids = new Set(drawing?.nodes.map(({ id }) => id) ?? []);
      return EXPECTED_NODES.filter((id) => ids.has(id)).length / EXPECTED_NODES.length;
    }),
  }),
  Scorer.make({
    name: 'refs-grounded',
    description: 'Every component node carries the documentation URL it was given (fraction).',
    score: drawn((drawing) => {
      const refs = new Map(drawing?.nodes.map(({ id, ref }) => [id, ref]) ?? []);
      const grounded = EXPECTED_NODES.filter((id) => refs.get(id) === `https://example.com/docs/${id.toLowerCase()}`);
      return grounded.length / EXPECTED_NODES.length;
    }),
  }),
  Scorer.make({
    name: 'connectors-connected',
    description: 'Connector count is at least the six described relationships.',
    score: drawn((drawing) => (drawing?.metrics.connectors ?? 0) >= 6),
  }),
];

const task = createEvalRunner({
  instructions: trim`
    The database starts empty.
    Create a drawing named "Relay" using the "${SVG_SCHEMA}" variant, then generate a mermaid
    flowchart of the system below into it, with one node per component (use the component name
    as the node id), a subgraph per group, edges for every relationship described, and a
    \`%% ref <Id> <url>\` line per node carrying its documentation URL. Read the diagnostics in the
    result and regenerate until there are no errors.

    ${SYSTEM}
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [IllustratorPlugin.make()],
  skills: [...getDefaultSkills(), Ref.make(UmlSkill.make())],
  timeout: 150_000,
  scored: true,
});

// Skipped: the SVG drawing variant is browser-only (`environments: []` in plugin-illustrator's
// capabilities), so under Node the illustrator tools are exposed with no variant behind them and
// every call fails. Unskip once the variant ships in the node barrel.
evalite.skip('Illustrator — diagram a described system as a legible, grounded flowchart', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
