//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '#types';

import { InvalidOperationInput } from '../errors';

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
