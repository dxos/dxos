//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Key } from '@dxos/echo';

import { NotADiagramError } from './open.ts';

/**
 * Shows one of the planks asked for, as the app shows one diagram: the last that names a diagram, the most recent in a
 * deck. A follow sets the leader's planks this way; with no diagram among them it pauses on the failure, as `Open` does.
 */
const handler: Operation.WithHandler<typeof LayoutOperation.Set> = LayoutOperation.Set.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, workspace }) {
      const named = subject.filter((path) => Key.EntityId.isValid(path.split('/').at(-1) ?? ''));
      for (const path of named.toReversed()) {
        const opened = yield* Operation.invoke(LayoutOperation.Open, { subject: [path], workspace }).pipe(
          Effect.as(true),
          Effect.orElseSucceed(() => false),
        );
        if (opened) {
          return;
        }
      }
      return yield* Effect.fail(new NotADiagramError());
    }),
  ),
);

export default handler;
