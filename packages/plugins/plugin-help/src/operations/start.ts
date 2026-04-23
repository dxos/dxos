//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { HelpCapabilities } from '../types';
import { Start } from './definitions';

const handler: Operation.WithHandler<typeof Start> = Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, running: true }));
    }),
  ),
);

export default handler;
