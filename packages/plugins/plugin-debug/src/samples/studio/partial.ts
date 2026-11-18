//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Database, Ref } from '@dxos/echo';
import * as Architecture from '@dxos/plugin-canvas/Architecture';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import { STUDIO_CANVAS, STUDIO_SLIDES, makeStudioDeck, slideCommands } from './deck.ts';

export type Provides = {
  /** The presentation, a slide per drawing. */
  readonly deck: Presentation.Presentation;
  /** Every slide's drawing, in the order presented. */
  readonly drawings: readonly Drawing.Drawing[];
};

/** The nine studio diagrams as canvas drawings, each built from its `.dx` text, and the deck that presents them. */
export const Partial: SampleSpace.Partial<Provides> = SampleSpace.partial('studio', {
  schemas: [...Architecture.canvasDrawingSchemas, Presentation.Presentation, Presentation.Slide],
  run: () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      // Read-only: a slide is looked at, and an editable canvas brings a rail that takes a corner of every one.
      const drawings = STUDIO_SLIDES.map((slide) =>
        Architecture.addCanvasDrawing(db, {
          name: slide.title,
          commands: slideCommands(slide),
          readonly: true,
          settings: STUDIO_CANVAS,
        }),
      );
      const deck = yield* Database.add(makeStudioDeck(drawings));
      yield* SampleSpace.collection(
        'Deck',
        [deck, ...drawings].map((object) => Ref.make(object)),
      );
      return { deck, drawings };
    }),
});
