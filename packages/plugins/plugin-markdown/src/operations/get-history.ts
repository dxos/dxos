//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { Markdown, MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.GetHistory> = MarkdownOperation.GetHistory.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc }) {
      // LLM-provided ref (may decode without a resolver): resolve through the db, not `ref.tryLoad`.
      const document = yield* Database.resolve(doc, Markdown.Document);
      const history = document.history;
      return {
        versions: (history?.versions ?? []).map(({ id, name, createdAt }) => ({ id, name, createdAt })),
        branches: (history?.branches ?? []).map(({ id, name, status, createdAt }) => ({
          id,
          name,
          status,
          createdAt,
        })),
      };
    }),
  ),
);

export default handler;
