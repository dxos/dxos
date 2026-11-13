//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Markdown, MarkdownOperation } from '#types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Create> = MarkdownOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      const { db } = yield* Database.Service;
      // plugin-space files it: on EDGE this plugin's bundle has no default-parent rule.
      const { id } = yield* Operation.invoke(
        SpaceOperation.AddObject,
        { object: Markdown.make({ name, content }) },
        { spaceId: db.spaceId },
      );

      // Persist before returning the id so other tools/processes (e.g. an agent's add-artifact, run
      // as a separate invocation) can resolve the freshly-created document.
      yield* Database.flush();

      return { id };
    }),
  ),
);

export default handler;
