//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { updateState } from './update-state.ts';

/** The app's only complementary panel is the space's members, in the Share dialog, such as presence's "See everyone". */
const handler: Operation.WithHandler<typeof LayoutOperation.UpdateComplementary> =
  LayoutOperation.UpdateComplementary.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ state }) {
        if (state) {
          yield* updateState(() => ({ sharing: state === 'expanded' }));
        }
      }),
    ),
  );

export default handler;
