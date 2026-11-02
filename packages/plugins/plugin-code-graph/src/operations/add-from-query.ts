//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CodeIndexClient } from '#client';
import { Model } from '#graph';
import { CodeGraphOperation } from '#types';

import { addPatch } from './util.ts';

const handler: Operation.WithHandler<typeof CodeGraphOperation.AddFromQuery> = CodeGraphOperation.AddFromQuery.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, sparql, limit }) {
      const graph = yield* Database.load(ref);
      const { rows } = yield* CodeIndexClient.query(sparql, limit);
      return { ...(yield* addPatch(graph, Model.fromRows(rows))), rows: rows.length };
    }),
  ),
);

export default handler;
