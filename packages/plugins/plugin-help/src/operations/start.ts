//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { HelpCapabilities } from '../types';
import { Start } from './definitions';

export default Start.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, running: true }));
    }),
  ),
);
