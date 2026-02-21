//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { HelpCapabilities, HelpOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: HelpOperation.Start,
        handler: Effect.fnUntraced(function* () {
          yield* Capabilities.updateAtomValue(HelpCapabilities.State, (state) => ({ ...state, running: true }));
        }),
      }),
    ]);
  }),
);
