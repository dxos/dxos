//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.GetHistory> = MarkdownOperation.GetHistory.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc }) {
      const document = yield* Database.load(doc);
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
