//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Branch } from '@dxos/versioning';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateBranch> = MarkdownOperation.CreateBranch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, name }) {
      // LLM-provided ref (may decode without a resolver): resolve through the db, not `ref.tryLoad`.
      const document = yield* Database.resolve(doc, Markdown.Document);
      const parent = yield* Database.load(document.content);
      const branch = yield* Effect.promise(() => Branch.create(document, { name, parent }));
      // Core branches share the parent Text's object id (the branch is an alternate timeline of
      // the same object); branch-scoped agent edits arrive with the stage-3 agent surface.
      return { branchId: branch.id, contentId: Obj.getURI(parent).toString() };
    }),
  ),
);

export default handler;
