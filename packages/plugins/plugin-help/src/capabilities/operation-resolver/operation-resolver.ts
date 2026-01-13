//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { HelpCapabilities, HelpOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.sync(() =>
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: HelpOperation.Start,
        handler: () =>
          Effect.sync(() => {
            const state = context.getCapability(HelpCapabilities.MutableState);
            state.running = true;
          }),
      }),
    ]),
  ),
);
