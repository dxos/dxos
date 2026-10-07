//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof OutlineOperation.GetOutline> = OutlineOperation.GetOutline.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline: outlineRef }) {
      const outline = yield* Database.load(outlineRef);
      // The ref is typed but unvalidated — the caller is a model passing an id it read elsewhere,
      // and any other object reaches `outline.content` as undefined and throws a raw TypeError.
      if (!Obj.instanceOf(Outline.Outline, outline)) {
        return yield* Effect.fail(
          new InvalidOperationInput({
            message: `Not an outline: ${Obj.getTypename(outline) ?? 'unknown type'}.`,
          }),
        );
      }
      const text = yield* Database.load(outline.content);
      return {
        id: outline.id,
        name: outline.name,
        content: text.content,
        items: Outline.parseChecklist(text.content),
      };
    }),
  ),
);

export default handler;
