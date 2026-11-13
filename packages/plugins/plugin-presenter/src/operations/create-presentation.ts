//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Presentation, PresenterOperation } from '#types';

import { slideIssues } from './slide-issues.ts';

const handler: Operation.WithHandler<typeof PresenterOperation.CreatePresentation> =
  PresenterOperation.CreatePresentation.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ name, slides }) {
        // Nothing is saved while any slide has a problem, so a corrected retry never duplicates a slide.
        const issues = slideIssues(slides);
        if (issues.length > 0) {
          return { issues };
        }
        const presentation = yield* Database.add(Presentation.make({ name, slides: [...slides] }));
        yield* DefaultParent.add({ object: presentation });
        // Persist before returning the id so a later tool call (or another process) can resolve the presentation.
        yield* Database.flush();
        return { id: Obj.getURI(presentation), issues };
      }),
    ),
  );

export default handler;
