//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Update } from './definitions';

export default Update.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc, content }) {
      const document = yield* Database.load(doc);
      const text = yield* Database.load(document.content);
      Obj.change(text, (text) => {
        text.content = content;
      });
    }),
  ),
);
