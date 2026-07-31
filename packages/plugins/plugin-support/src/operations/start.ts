//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import { HelpCapabilities, HelpOperation } from '../types';

const handler: Operation.WithHandler<typeof HelpOperation.Start> = HelpOperation.Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, running: true }));
    }),
  ),
);

export default handler;
