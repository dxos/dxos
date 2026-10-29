//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CodeGraphOperation } from '#types';

import { removeNodes } from './util.ts';

const handler: Operation.WithHandler<typeof CodeGraphOperation.Remove> = CodeGraphOperation.Remove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, nodes, all }) {
      const graph = yield* Database.load(ref);
      return yield* removeNodes(graph, all ? undefined : (nodes ?? []));
    }),
  ),
);

export default handler;
