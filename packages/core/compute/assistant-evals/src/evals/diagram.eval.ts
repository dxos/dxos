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

import { findObject } from '../assertions';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';

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
  dbQuery: () =>
    Effect.gen(function* () {
      const drawing = yield* findObject(Drawing.Drawing, (entry) => entry.name === 'Relay');
      if (!drawing) {
        return undefined;
      }
      const canvas = yield* Database.load(drawing.canvas);
      const { scene } = SvgBuilder.read(canvas);
      const report = Diagnostics.analyze(scene.objects);
      const nodes = scene.objects.filter((object) => object.id !== 'edges').map(({ id, ref }) => ({ id, ref }));
      return {
        errors: Diagnostics.errors(report).map(({ message }) => message),
        metrics: report.metrics,
        nodes,
      };
    }),
});

evalite('Illustrator — diagram a described system as a legible, grounded flowchart', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'drawing-generated',
      description: 'A drawing named "Relay" exists and holds at least one node.',
      scorer: ({ output }) => ((output.dbQuery?.nodes.length ?? 0) > 0 ? 1 : 0),
    },
    {
      name: 'no-hard-defects',
      description: 'Diagnostics report no errors (overlap, route through node, label overflow).',
      scorer: ({ output }) => (output.dbQuery && output.dbQuery.errors.length === 0 ? 1 : 0),
    },
    {
      name: 'components-present',
      description: 'Every described component appears as a node (fraction present).',
      scorer: ({ output }) => {
        const ids = new Set(output.dbQuery?.nodes.map(({ id }) => id) ?? []);
        return EXPECTED_NODES.filter((id) => ids.has(id)).length / EXPECTED_NODES.length;
      },
    },
    {
      name: 'refs-grounded',
      description: 'Every component node carries the documentation URL it was given (fraction).',
      scorer: ({ output }) => {
        const refs = new Map(output.dbQuery?.nodes.map(({ id, ref }) => [id, ref]) ?? []);
        const grounded = EXPECTED_NODES.filter((id) => refs.get(id) === `https://example.com/docs/${id.toLowerCase()}`);
        return grounded.length / EXPECTED_NODES.length;
      },
    },
    {
      name: 'connectors-connected',
      description: 'Connector count is at least the six described relationships.',
      scorer: ({ output }) => ((output.dbQuery?.metrics.connectors ?? 0) >= 6 ? 1 : 0),
    },
  ],
});
