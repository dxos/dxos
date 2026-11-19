//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import * as Architecture from '@dxos/plugin-canvas/Architecture';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import { DIAGRAMS, diagramCommands, diagramTitle, makeStudioDeck, studioCanvas } from './deck.ts';

export type Provides = {
  /** The presentation: a slide per markdown file, the diagram slides embedding their drawings. */
  readonly deck: Presentation.Presentation;
  /** Every diagram's drawing, by diagram id. */
  readonly drawings: ReadonlyMap<string, Drawing.Drawing>;
};

/** The studio diagrams as canvas drawings, each built from its `.dx` text, and the deck whose slides embed them. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('studio', {
  schemas: [...Architecture.canvasDrawingSchemas, Presentation.Presentation, Presentation.Slide],
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      // Read-only: a slide is looked at, and an editable canvas brings a rail that takes a corner of every one.
      const drawings = new Map(
        DIAGRAMS.map((diagram) => [
          diagram.id,
          Architecture.addCanvasDrawing(db, {
            name: diagramTitle(diagram.id),
            commands: diagramCommands(diagram),
            readonly: true,
            settings: studioCanvas(diagram),
          }),
        ]),
      );
      const deck = yield* Database.add(makeStudioDeck(drawings));
      yield* SampleSpace.collection(
        'Deck',
        [deck, ...drawings.values()].map((object) => Ref.make(object)),
      );
      return { deck, drawings };
    }),
});
