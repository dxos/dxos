//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { SearchOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SearchOperation.OpenSearch,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.UpdateComplementary, { subject: 'search' });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),
    ]);
  }),
);
