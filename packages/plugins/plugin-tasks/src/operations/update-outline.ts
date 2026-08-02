//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '../types';

/**
 * Item-wise upsert is the default so an agent can flip one checkbox without rewriting the
 * document — the markdown is a human surface too, and prose between items must survive.
 */
const handler: Operation.WithHandler<typeof OutlineOperation.UpdateOutline> = OutlineOperation.UpdateOutline.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline: outlineRef, items, content }) {
      if ((items === undefined) === (content === undefined)) {
        return yield* Effect.fail(new Error('Provide exactly one of `items` or `content`.'));
      }

      const outline = yield* Database.load(outlineRef);
      const text = yield* Database.load(outline.content);
      Obj.update(text, (text) => {
        text.content = content ?? Outline.upsertChecklistItems(text.content, items!);
      });

      return { id: outline.id, content: text.content };
    }),
  ),
);

export default handler;
