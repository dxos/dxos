//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { CodeGraph, CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.Create> = CodeGraphOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, layout }) {
      return { object: yield* Database.add(CodeGraph.make({ name, ...(layout && { layout }) })) };
    }),
  ),
);

export default handler;
