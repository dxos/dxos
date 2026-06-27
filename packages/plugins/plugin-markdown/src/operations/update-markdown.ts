//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj, Text } from '@dxos/echo';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Update> = MarkdownOperation.Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, edits }) {
      const content = yield* doc.pipe(
        Database.load,
        Effect.map((_) => _.content),
        Effect.flatMap(Database.load),
      );

      let newContent = '';
      Obj.update(content, () => {
        newContent = Text.apply(content, 'content', edits);
      });
      return { newContent };
    }),
  ),
);

export default handler;
