//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Presentation, PresenterOperation } from '#types';

import { slideIssues } from './slide-issues.ts';

const handler: Operation.WithHandler<typeof PresenterOperation.AddSection> = PresenterOperation.AddSection.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ presentation: presentationRef, content, object, index }) {
      const presentation = yield* Database.load(presentationRef);
      if (object) {
        Presentation.link(presentation, yield* Database.load(object), index);
        return { issues: [] };
      }
      if (content === undefined || content.trim() === '') {
        return { issues: ['Give either the content of a new slide or an object to link.'] };
      }
      Presentation.addSlide(presentation, content, index);
      return { issues: slideIssues([content], (index ?? presentation.sections.length - 1) + 1) };
    }),
  ),
);

export default handler;
