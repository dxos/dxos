//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';

import { Presentation, PresenterOperation } from '#types';

import { PresenterOperationError } from './errors.ts';

const handler: Operation.WithHandler<typeof PresenterOperation.PresentObject> = PresenterOperation.PresentObject.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ object: ref }) {
      const object = yield* Database.load(ref);
      if (!Obj.instanceOf(Presentation.Presentation, object) && !Obj.instanceOf(Markdown.Document, object)) {
        return yield* Effect.fail(
          new PresenterOperationError({ message: 'Only a presentation or a markdown document can be presented.' }),
        );
      }
      yield* Operation.invoke(PresenterOperation.SetPresenting, { object, state: true });
    }),
  ),
);

export default handler;
