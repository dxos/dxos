//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, SettingsOperation } from '@dxos/app-framework';
import { Operation, OperationResolver } from '@dxos/operation';

import { REGISTRY_ID } from '../../meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SettingsOperation.OpenPluginRegistry,
        handler: () =>
          Effect.gen(function* () {
            yield* Operation.invoke(Common.LayoutOperation.SwitchWorkspace, { subject: REGISTRY_ID });
          }),
      }),
    ]);
  }),
);
