//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { ReadTasks } from './definitions';

export default ReadTasks.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc }) {
      const document = yield* Database.load(doc);

      const { content } = yield* Database.load(document.content);
      const lines = content.split('\n');
      const len = String(lines.length).length;
      const numbered = lines.map((line, i) => `${String(i + 1).padStart(len, ' ')}. ${line}`).join('\n');
      return { content: numbered };
    }),
  ),
);
