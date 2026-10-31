//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Sheet from '@dxos/plugin-sheet/Sheet';

import { DIAGRAM_COMMANDS } from './compiled.ts';
import { canvasDrawingSchemas, loadDiagramDrawings } from './diagrams.ts';
import { type Docs, makeDocs } from './docs.ts';
import { makeEchoDeck } from './echo-deck.ts';
import { makeEchoBenchmarks, makeEchoDesign } from './echo-design.ts';
import { makePluginMetrics } from './metrics.ts';
import { architectureDiagrams } from './sets.ts';

export type Provides = {
  /** Every diagram's drawing, by diagram id. */
  readonly drawings: ReadonlyMap<string, Drawing.Drawing>;
  readonly docs: Docs;
  /** The ECHO presentation, embedding the data-stack and EDGE drawings. */
  readonly echo: Presentation.Presentation;
  /** Per-plugin LOC, PRs and tests, with a bar chart of them. */
  readonly metrics: Sheet.Sheet;
  /** The ECHO design document, embedding the three ECHO diagrams and the benchmarks sheet. */
  readonly design: Markdown.Document;
  /** ECHO benchmark timings against their targets, with a bar chart. */
  readonly benchmarks: Sheet.Sheet;
};

/** Composer and EDGE as nested canvas drawings, with the three documents that introduce them and a sheet of plugin metrics. Spec: `CONTENT.md`. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('architecture', {
  schemas: [
    ...canvasDrawingSchemas,
    Markdown.Document,
    Presentation.Presentation,
    Presentation.Slide,
    Sheet.Sheet,
    Sheet.Chart,
  ],
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const set = architectureDiagrams(DIAGRAM_COMMANDS);
      // The DSL compiler is promise-based at this boundary; a failure is a broken bundled diagram, so a defect.
      const drawings = yield* Effect.promise(() => loadDiagramDrawings(db, set));
      const composer = drawings.get('composer');
      const data = drawings.get('composer-data');
      const edge = drawings.get('edge');
      if (!composer || !data || !edge) {
        return yield* Effect.die(new Error('The architecture diagram set is missing an overview.'));
      }
      // The documents introduce the diagrams and embed them; every other diagram is reached by drilling into a box.
      const docs = makeDocs({ composer, data, edge });
      for (const doc of [docs.composer, docs.dxos, docs.edge]) {
        yield* Database.add(doc);
      }
      const echo = yield* Database.add(makeEchoDeck(Object.fromEntries(drawings)));
      const metrics = yield* Database.add(makePluginMetrics());
      const [model, sync, query] = ['echo-model', 'echo-sync', 'echo-query'].map((id) => drawings.get(id));
      if (!model || !sync || !query) {
        return yield* Effect.die(new Error('The architecture diagram set is missing an ECHO diagram.'));
      }
      const benchmarks = yield* Database.add(makeEchoBenchmarks());
      const design = yield* Database.add(
        makeEchoDesign({ 'echo-model': model, 'echo-sync': sync, 'echo-query': query, 'echo-benchmarks': benchmarks }),
      );
      yield* SampleSpace.collection(
        'Architecture',
        [docs.composer, docs.dxos, docs.edge, design, echo, composer, edge, metrics].map((object) => Ref.make(object)),
      );
      return { drawings, docs, echo, metrics, design, benchmarks };
    }),
});
