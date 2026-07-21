//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentIdentity, Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Branch } from '@dxos/versioning';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.SuggestEdit> = MarkdownOperation.SuggestEdit.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, creator }) {
      // Attribute the suggestion to the caller: an explicit `creator`, else the calling agent's
      // identity DID (supplied by the runtime). One of the two must be present.
      const author = creator ?? (yield* AgentIdentity.currentDid);
      if (!author) {
        return yield* Effect.die(new Error('SuggestEdit requires a creator or an agent identity in scope.'));
      }
      const document = yield* Database.load(doc);
      const parent = yield* Database.load(document.content);
      // Find-or-create the caller's suggestion branch (idempotent per author); edits routed to it
      // accrue a single reviewable set of changes rather than a branch per edit.
      const branch = yield* Effect.promise(() => Branch.suggestion(document, parent, author));
      return { branchId: branch.id, contentId: Obj.getURI(parent).toString() };
    }),
  ),
);

export default handler;
