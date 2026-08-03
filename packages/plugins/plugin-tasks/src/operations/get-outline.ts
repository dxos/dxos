//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '../types';

const handler: Operation.WithHandler<typeof OutlineOperation.GetOutline> = OutlineOperation.GetOutline.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline: outlineRef }) {
      const outline = yield* Database.load(outlineRef);
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
