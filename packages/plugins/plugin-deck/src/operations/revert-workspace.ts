//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';

import { DeckCapabilities } from '../types';

const handler: Operation.WithHandler<typeof LayoutOperation.RevertWorkspace> = LayoutOperation.RevertWorkspace.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: state.previousDeck });
    }),
  ),
);

export default handler;
