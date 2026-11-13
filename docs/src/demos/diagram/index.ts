//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database } from '@dxos/echo';
import {
  DIAGRAM_COMMANDS,
  canvasDrawingSchemas,
  composerDiagrams,
  loadDiagramSet,
} from '@dxos/plugin-canvas/Architecture';
import * as CanvasPlugin from '@dxos/plugin-canvas/CanvasPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';

import * as Demo from '../Demo.ts';

const partial = SampleSpace.partial('echo-demo-diagram', {
  schemas: canvasDrawingSchemas,
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const overview = yield* Effect.promise(() => loadDiagramSet(db, composerDiagrams(DIAGRAM_COMMANDS)));
      return { overview };
    }),
});

/** Composer's architecture as nested canvas drawings: a box with a level beneath it opens it. */
export const DiagramDemo = Demo.make({
  id: 'diagram',
  title: 'Infinite canvas',
  partial,
  plugins: () => [IllustratorPlugin.make(), CanvasPlugin.make()],
  views: { overview: 'Overview' },
  layout: ['overview'],
});
