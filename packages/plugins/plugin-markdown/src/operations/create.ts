//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CollectionModel } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

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
      yield* CollectionModel.add({ object });
      // Persist before returning the id so other tools/processes (e.g. an agent's add-artifact, run
      // as a separate invocation) can resolve the freshly-created document.
      yield* Database.flush();

      // DIAGNOSTIC: confirm the object is now resolvable in its own db, with a qualified URI.
      const { db } = yield* Database.Service;
      const roundtrip = db.getObjectById(object.id);
      log.info('markdown.create', {
        uri: Obj.getURI(object),
        objectId: object.id,
        spaceId: db.spaceId,
        resolvableInOwnDb: !!roundtrip,
      });

      return {
        id: Obj.getURI(object),
      };
    }),
  ),
);

export default handler;
