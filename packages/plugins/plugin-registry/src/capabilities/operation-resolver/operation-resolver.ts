//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, SettingsOperation } from '@dxos/app-framework';

import { REGISTRY_ID } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SettingsOperation.OpenPluginRegistry,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: REGISTRY_ID });
          }).pipe(Effect.provideService(Capability.PluginContextService, context)),
      }),
    ]);
  }),
);
