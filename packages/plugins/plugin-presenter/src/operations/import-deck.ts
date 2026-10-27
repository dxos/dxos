//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { splitSlides } from '#markdown';
import { Presentation, PresenterOperation } from '#types';

import { slideIssues } from './slide-issues.ts';

const handler: Operation.WithHandler<typeof PresenterOperation.ImportDeck> = PresenterOperation.ImportDeck.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, markdown }) {
      const slides = splitSlides(markdown);
      // Nothing is saved while any slide has a problem, so a corrected retry never leaves a partial deck behind.
      const issues = slideIssues(slides);
      if (issues.length > 0) {
        return { slides: slides.length, issues };
      }
      const presentation = yield* Database.add(Presentation.make({ name, slides }));
      yield* DefaultParent.add({ object: presentation });
      // Persist before returning the id so a later tool call (or another process) can resolve the presentation.
      yield* Database.flush();
      return { id: Obj.getURI(presentation), slides: slides.length, issues };
    }),
  ),
);

export default handler;
