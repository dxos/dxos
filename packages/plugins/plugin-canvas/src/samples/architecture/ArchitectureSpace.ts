//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { loadDiagramDrawings } from './diagrams.ts';
import { architectureDiagrams } from './sets.ts';
import { DIAGRAM_SOURCES } from './sources.ts';

const phases = {
  diagrams: SampleSpace.phase('diagrams', {
    schemas: [Drawing.Drawing, Drawing.Canvas],
    run: () =>
      Effect.gen(function* () {
        const { db } = yield* Database.Service;
        const set = architectureDiagrams(DIAGRAM_SOURCES);
        // The DSL compiler is promise-based at this boundary; a failure is a broken bundled diagram, so a defect.
        const drawings = yield* Effect.promise(() => loadDiagramDrawings(db, set));
        // Only the two overviews are listed; every other diagram is reached by drilling into a box.
        const overviews = ['composer', 'edge'].flatMap((id) => {
          const drawing = drawings.get(id);
          return drawing ? [Ref.make(drawing)] : [];
        });
        yield* SampleSpace.collection('Architecture', overviews);
      }),
  }),
};

/** Composer and EDGE as nested canvas drawings: each overview's boxes open the diagrams beneath them. */
export const make = (): SampleSpace.Definition<typeof phases, void> =>
  SampleSpace.make({
    space: { name: 'DXOS Architecture', icon: 'graph', hue: 'indigo' },
    phases,
    build: (phases) => phases.diagrams(),
  });

export const makeTemplate = (): AppCapabilities.SpaceTemplate =>
  SampleSpace.makeTemplate({
    id: 'org.dxos.plugin.canvas.template.architecture',
    description:
      'The Composer and EDGE architecture as canvas drawings: open a box to drill into the diagram beneath it.',
    definition: make(),
  });
