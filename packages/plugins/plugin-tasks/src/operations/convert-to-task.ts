//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Outline } from '@dxos/types';

import { OutlineOperation } from '#types';

const handler: Operation.WithHandler<typeof OutlineOperation.ConvertToTask> = OutlineOperation.ConvertToTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ outline, title }) {
      const { db } = yield* Database.Service;
      const task = yield* Effect.promise(() => Outline.createTask(outline, db, title));
      return { task };
    }),
  ),
);

export default handler;
