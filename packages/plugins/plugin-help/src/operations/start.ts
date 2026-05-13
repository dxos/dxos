//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { HelpCapabilities, HelpOperation } from '../types';

const handler: Operation.WithHandler<typeof HelpOperation.Start> = HelpOperation.Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, running: true }));
    }),
  ),
);

export default handler;
