//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.UpdateDialog> = LayoutOperation.UpdateDialog.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject, state, type, props }) {
      yield* updateState((current) => {
        // A close naming another dialog than the one shown leaves it be.
        if (state === false && subject && current.dialogContent?.component !== subject) {
          return {};
        }
        return {
          dialogOpen: state ?? Boolean(subject),
          dialogType: type ?? 'default',
          dialogContent: state === false ? undefined : subject ? { component: subject, props } : current.dialogContent,
        };
      });
    }),
  ),
);

export default handler;
