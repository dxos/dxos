//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { InvalidOperationInput } from '../errors';
import { OutlineOperation } from '../types';

/**
 * Item-wise upsert is the default so an agent can flip one checkbox without rewriting the
 * document — the markdown is a human surface too, and prose between items must survive.
 */
const handler: Operation.WithHandler<typeof OutlineOperation.UpdateOutline> = OutlineOperation.UpdateOutline.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline: outlineRef, items, content }) {
      // The transform is resolved from the arguments alone, before any I/O: a bad argument must
      // fail as `InvalidOperationInput`, never as a storage error from loading the ref first.
      // Each branch closes over its own narrowed input, so no assertion is needed downstream.
      const apply =
        items !== undefined && content === undefined
          ? (current: string) => Outline.upsertChecklistItems(current, items)
          : content !== undefined && items === undefined
            ? () => content
            : undefined;
      if (apply === undefined) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'Provide exactly one of `items` or `content`.' }),
        );
      }

      const outline = yield* Database.load(outlineRef);
      const text = yield* Database.load(outline.content);
      Obj.update(text, (text) => {
        text.content = apply(text.content);
      });

      return { id: outline.id, content: text.content };
    }),
  ),
);

export default handler;
