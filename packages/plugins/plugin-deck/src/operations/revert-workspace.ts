//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

export default LayoutOperation.RevertWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: state.previousDeck });
    }),
  ),
);
