//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { Command } from '#command';
import { CodeGraphOperation } from '#types';

const handler: Operation.WithHandler<typeof CodeGraphOperation.RunCommand> = CodeGraphOperation.RunCommand.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ graph: ref, command }) {
      const graph = yield* Database.load(ref);
      return Command.toOutput(yield* Command.runWithAiService(graph, command));
    }),
  ),
);

export default handler;
