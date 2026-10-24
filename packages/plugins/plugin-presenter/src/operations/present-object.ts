//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Presentation, PresenterOperation } from '#types';

const handler: Operation.WithHandler<typeof PresenterOperation.PresentObject> = PresenterOperation.PresentObject.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ object: ref }) {
      const object = yield* Database.load(ref);
      if (Obj.instanceOf(Presentation.Presentation, object) || Obj.instanceOf(Markdown.Document, object)) {
        yield* Operation.invoke(PresenterOperation.SetPresenting, { object, state: true });
      }
    }),
  ),
);

export default handler;
