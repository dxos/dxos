//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '#types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Create> = MarkdownOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      const object = yield* Database.add(Markdown.make({ name, content }));
      yield* DefaultParent.add({ object });

      // Persist before returning the id so other tools/processes (e.g. an agent's add-artifact, run
      // as a separate invocation) can resolve the freshly-created document.
      yield* Database.flush();

      return {
        id: Obj.getURI(object),
      };
    }),
  ),
);

export default handler;
