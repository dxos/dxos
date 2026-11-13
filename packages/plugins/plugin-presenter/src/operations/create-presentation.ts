//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

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
        const { db } = yield* Database.Service;
        // plugin-space files it: on EDGE this plugin's bundle has no default-parent rule.
        const { id } = yield* Operation.invoke(
          SpaceOperation.AddObject,
          { object: Presentation.make({ name, slides: [...slides] }) },
          { spaceId: db.spaceId },
        );
        // Persist before returning the id so a later tool call (or another process) can resolve the presentation.
        yield* Database.flush();
        return { id, issues };
      }),
    ),
  );

export default handler;
