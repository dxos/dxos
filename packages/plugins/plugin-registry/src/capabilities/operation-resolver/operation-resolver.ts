//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver, SettingsOperation } from '@dxos/app-framework';

import { REGISTRY_ID } from '../../meta';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SettingsOperation.OpenPluginRegistry,
        handler: () =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: REGISTRY_ID });
          }),
      }),
    ]),
  ),
);
