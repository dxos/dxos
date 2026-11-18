//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Query, Relation } from '@dxos/echo';

import { CodeOperation, SpecItem } from '#types';

import { SpecItemError, endpoints, readItem } from './util.ts';

const handler: Operation.WithHandler<typeof CodeOperation.LinkTask> = CodeOperation.LinkTask.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ task: taskRef, spec: specRef, item: name }) {
      const task = yield* Database.load(taskRef);
      const spec = yield* Database.load(specRef);
      const read = readItem(spec, yield* Database.load(spec.content), name);
      if (!read) {
        return yield* Effect.fail(new SpecItemError({ message: `"${spec.name}" has no block ${name}.` }));
      }
      const { key } = read.item;
      const existing = yield* Database.query(Query.select(Filter.id(task.id)).sourceOf(SpecItem.Implements)).run;
      if (existing.some((relation) => endpoints(relation)[1] === spec.id && relation.item === key)) {
        return;
      }
      yield* Database.add(SpecItem.makeImplements({ [Relation.Source]: task, [Relation.Target]: spec, item: key }));
      yield* Database.flush();
    }),
  ),
);

export default handler;
