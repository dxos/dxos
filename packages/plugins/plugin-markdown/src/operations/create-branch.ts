//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Branch } from '@dxos/versioning';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.CreateBranch> = MarkdownOperation.CreateBranch.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, name }) {
      const document = yield* Database.load(doc);
      const parent = yield* Database.load(document.content);
      const branch = Branch.create(document, { name, parent });
      const branchText = yield* Database.load(branch.content);
      return { branchId: branch.id, contentId: Obj.getURI(branchText).toString() };
    }),
  ),
);

export default handler;
