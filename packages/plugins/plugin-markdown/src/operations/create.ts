//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Create> = MarkdownOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, content }) {
      // Add the object to the database directly so it is persisted with a space-qualified URI and is
      // resolvable by id. `CollectionModel.add` only pushes a `Ref` into the space root collection;
      // when that collection does not yet exist (e.g. a freshly-created space in a headless/agent
      // flow) it builds a detached collection that never triggers the transitive ref-save, leaving
      // the object unattached — so a returned `echo:/<id>` never resolves.
      const object = yield* Database.add(Markdown.make({ name, content }));

      // Best-effort: add to the space root collection for navigation. Do NOT fail document creation
      // if this races — e.g. concurrent sub-agents both materializing the root collection can throw
      // EntityNotFoundError while loading a not-yet-flushed collection ref. The document itself is
      // already persisted above, so swallow the error and still return its id.
      yield* CollectionModel.add({ object }).pipe(Effect.catchAll(() => Effect.void));

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
