//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Branch as VersioningBranch } from '@dxos/versioning';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.MergeBranch> = MarkdownOperation.MergeBranch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, branchId }) {
      const document = yield* Database.load(doc);
      const branch = document.history?.branches.find((candidate) => candidate.id === branchId);
      invariant(branch, `branch not found: ${branchId}`);
      const parent = yield* Database.load(branch.parent);
      if (branch.content) {
        // Legacy content-copy branches merge textually and need their Text loaded.
        yield* Database.load(branch.content);
      }
      const { conflicts } = yield* Effect.promise(() => VersioningBranch.merge(document, branch));
      return { conflicts, newContent: parent.content };
    }),
  ),
);

export default handler;
